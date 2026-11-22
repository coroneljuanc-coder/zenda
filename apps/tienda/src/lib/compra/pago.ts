import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { MONEDA, aCentavos } from "./wompi";

/**
 * Confirmación del pago por webhook de Wompi (ZTV-21, COM-03). El navegador del cliente no es una
 * fuente confiable: solo un aviso de Wompi con firma válida cambia el estado de pago (RN1).
 */

/** Forma del aviso «transaction.updated» de Wompi (solo lo que Zenda usa). */
const EsquemaEvento = z.object({
  event: z.string(),
  data: z.object({
    transaction: z.object({
      id: z.string(),
      status: z.string(),
      reference: z.string(),
      amount_in_cents: z.number().int(),
      currency: z.string(),
      payment_method_type: z.string().optional(),
    }),
  }),
  signature: z.object({ properties: z.array(z.string()).min(1), checksum: z.string() }),
  timestamp: z.number().int(),
});

export type EventoWompi = z.infer<typeof EsquemaEvento>;

/** Lee el aviso; `null` si no tiene la forma esperada. */
export function leerEvento(cuerpo: unknown): EventoWompi | null {
  const r = EsquemaEvento.safeParse(cuerpo);
  return r.success ? r.data : null;
}

/** Busca un valor del aviso por su ruta, por ejemplo «transaction.amount_in_cents». */
function valorEn(datos: unknown, ruta: string): string {
  const valor = ruta
    .split(".")
    .reduce<unknown>((o, clave) => (o as Record<string, unknown> | undefined)?.[clave], datos);
  return valor === undefined || valor === null ? "" : String(valor);
}

/**
 * RN1: verifica el checksum de Wompi = SHA-256 de los valores de `signature.properties` (tomados
 * de `data`), luego `timestamp` y al final el secreto de eventos. Se compara en tiempo constante.
 */
export function verificarChecksumWompi(evento: EventoWompi, secretoEventos: string): boolean {
  const cadena =
    evento.signature.properties.map((ruta) => valorEn(evento.data, ruta)).join("") +
    String(evento.timestamp) +
    secretoEventos;
  const esperado = createHash("sha256").update(cadena).digest("hex");
  const recibido = evento.signature.checksum.toLowerCase();
  return (
    recibido.length === esperado.length &&
    timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado))
  );
}

export type ResultadoPago =
  | "pagado"
  | "rechazado"
  | "repetido"
  | "pendiente"
  | "revision-monto"
  | "revision-stock"
  | "pedido-desconocido"
  | "ignorado";

const RECHAZOS = new Set(["DECLINED", "ERROR", "VOIDED"]);

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Aplica un aviso con firma ya verificada. Todo pasa en una transacción con el pedido y las
 * variantes bloqueados, para que dos avisos o dos compras simultáneas no se pisen.
 * - APPROVED con el mismo monto: «Pagado», descuenta el stock y vacía el carrito (RN2).
 * - APPROVED repetido: no hace nada otra vez (RN4).
 * - Monto o moneda distintos: «Requiere revisión», sin tocar el stock (escenario 3).
 * - Sin stock suficiente: «Requiere revisión» y alerta; el stock nunca queda negativo (RN3).
 * - DECLINED, ERROR o VOIDED: «Pago rechazado», el carrito se conserva (escenario 2).
 * - Un pedido «Pagado» nunca vuelve atrás (RN5).
 * Cada aviso queda registrado en EventoPago con lo que se hizo (trazabilidad).
 */
export async function procesarEventoPago(
  bd: PrismaClient,
  evento: EventoWompi,
  ahora = new Date(),
): Promise<ResultadoPago> {
  const { transaction } = evento.data;
  const resultado = await bd.$transaction((tx) => aplicar(tx, evento, ahora), { timeout: 15_000 });
  await bd.eventoPago.create({
    data: {
      proveedor: "wompi",
      transaccionId: transaction.id,
      referencia: transaction.reference,
      estado: transaction.status,
      recibidoEn: ahora,
      resultado,
    },
  });
  if (resultado === "revision-monto" || resultado === "revision-stock") {
    // Alerta para el vendedor en los registros de Vercel (el aviso por correo llega con E7).
    console.error(
      `[ALERTA] Pedido ${transaction.reference} requiere revisión (${resultado}): gestionar reembolso o reposición.`,
    );
  }
  return resultado;
}

async function aplicar(tx: Tx, evento: EventoWompi, ahora: Date): Promise<ResultadoPago> {
  const { transaction } = evento.data;
  const pedido = await tx.pedido.findUnique({
    where: { referencia: transaction.reference },
    select: { id: true, estado: true, total: true, carritoId: true },
  });
  if (!pedido) return "pedido-desconocido";
  await tx.$queryRaw`SELECT id FROM "Pedido" WHERE id = ${pedido.id} FOR UPDATE`;
  // Se vuelve a leer ya bloqueado: otro aviso pudo cambiarlo mientras esperábamos.
  const actual = await tx.pedido.findUniqueOrThrow({
    where: { id: pedido.id },
    select: { estado: true },
  });

  if (actual.estado === "PAGADO") return "repetido";
  if (actual.estado === "REQUIERE_REVISION") return "ignorado";

  if (RECHAZOS.has(transaction.status)) {
    if (actual.estado !== "PENDIENTE_PAGO") return "ignorado";
    await tx.pedido.update({ where: { id: pedido.id }, data: { estado: "PAGO_RECHAZADO" } });
    return "rechazado";
  }
  if (transaction.status !== "APPROVED") return "pendiente";

  if (transaction.amount_in_cents !== aCentavos(pedido.total) || transaction.currency !== MONEDA) {
    await tx.pedido.update({ where: { id: pedido.id }, data: { estado: "REQUIERE_REVISION" } });
    return "revision-monto";
  }

  const lineas = await tx.lineaPedido.findMany({
    where: { pedidoId: pedido.id },
    select: { varianteId: true, cantidad: true },
  });
  const ids = lineas.map((l) => l.varianteId);
  // Bloquea las variantes: dos compras a la vez no se llevan la misma última unidad.
  const existencias = await tx.$queryRaw<{ id: string; stock: number }[]>`
    SELECT id, stock FROM "VarianteProducto" WHERE id = ANY(${ids}) FOR UPDATE`;
  const stock = new Map(existencias.map((v) => [v.id, v.stock]));
  if (lineas.some((l) => (stock.get(l.varianteId) ?? 0) < l.cantidad)) {
    await tx.pedido.update({ where: { id: pedido.id }, data: { estado: "REQUIERE_REVISION" } });
    return "revision-stock";
  }

  for (const linea of lineas) {
    await tx.varianteProducto.update({
      where: { id: linea.varianteId },
      data: { stock: { decrement: linea.cantidad } },
    });
  }
  await tx.pedido.update({
    where: { id: pedido.id },
    data: {
      estado: "PAGADO",
      wompiTransaccionId: transaction.id,
      metodoPago: transaction.payment_method_type ?? null,
      pagadoEn: ahora,
    },
  });
  if (pedido.carritoId)
    await tx.lineaCarrito.deleteMany({ where: { carritoId: pedido.carritoId } });
  return "pagado";
}

/** Registra un aviso que no se pudo aceptar (firma inválida o forma desconocida). */
export async function registrarEventoRechazado(
  bd: PrismaClient,
  evento: EventoWompi | null,
  resultado: "firma-invalida" | "forma-invalida",
): Promise<void> {
  const t = evento?.data.transaction;
  await bd.eventoPago.create({
    data: {
      proveedor: "wompi",
      transaccionId: t?.id ?? null,
      referencia: t?.reference ?? null,
      estado: t?.status ?? null,
      resultado,
    },
  });
}
