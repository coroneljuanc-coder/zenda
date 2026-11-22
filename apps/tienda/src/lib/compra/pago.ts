import type { PrismaClient } from "@/generated/prisma/client";
import { MONEDA, type PagoPasarela } from "./mercadopago";

/**
 * Confirmación del pago (ZTV-21, con Mercado Pago desde ZTV-86). Recibe el pago ya consultado a la
 * pasarela con la credencial privada (RN3 de ZTV-86): el navegador del cliente y el contenido del
 * aviso no son fuentes confiables.
 */

export type ResultadoPago =
  | "pagado"
  | "rechazado"
  | "repetido"
  | "pendiente"
  | "revision-monto"
  | "revision-stock"
  | "revision-pago-real"
  | "pedido-desconocido"
  | "ignorado";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Aplica el pago. Todo pasa en una transacción con el pedido y las variantes bloqueados, para que
 * dos avisos o dos compras simultáneas no se pisen.
 * - Aprobado con el mismo monto: «Pagado», descuenta el stock y vacía el carrito (RN2).
 * - Aprobado repetido: no hace nada otra vez (RN4).
 * - Monto o moneda distintos: «Requiere revisión», sin tocar el stock (escenario 3).
 * - Sin stock suficiente: «Requiere revisión» y alerta; el stock nunca queda negativo (RN3).
 * - Aprobado pero real (no de prueba): «Requiere revisión» y alerta, sin tocar el stock (ZTV-89):
 *   mientras la tienda esté en pruebas no se aceptan cobros reales (D1).
 * - Rechazado o cancelado: «Pago rechazado», el carrito se conserva (escenario 2).
 * - Un pedido «Pagado» nunca vuelve atrás (RN5).
 * Cada aviso queda registrado en EventoPago con lo que se hizo (trazabilidad).
 */
export async function procesarPago(
  bd: PrismaClient,
  pago: PagoPasarela,
  ahora = new Date(),
): Promise<ResultadoPago> {
  const resultado = await bd.$transaction((tx) => aplicar(tx, pago, ahora), { timeout: 15_000 });
  await bd.eventoPago.create({
    data: {
      proveedor: pago.proveedor,
      transaccionId: pago.id,
      referencia: pago.referencia,
      estado: pago.estadoOriginal,
      recibidoEn: ahora,
      resultado,
    },
  });
  if (resultado.startsWith("revision-")) {
    // Alerta para el vendedor en los registros de Vercel (el aviso por correo llega con E7).
    console.error(
      `[ALERTA] Pedido ${pago.referencia} requiere revisión (${resultado}): gestionar reembolso o reposición.`,
    );
  }
  return resultado;
}

async function aplicar(tx: Tx, pago: PagoPasarela, ahora: Date): Promise<ResultadoPago> {
  const pedido = await tx.pedido.findUnique({
    where: { referencia: pago.referencia },
    select: { id: true, total: true, carritoId: true },
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

  if (pago.estado === "rechazado") {
    if (actual.estado !== "PENDIENTE_PAGO") return "ignorado";
    await tx.pedido.update({ where: { id: pedido.id }, data: { estado: "PAGO_RECHAZADO" } });
    return "rechazado";
  }
  if (pago.estado === "pendiente") return "pendiente";
  if (pago.estado !== "aprobado") return "ignorado";

  if (pago.real) {
    await tx.pedido.update({ where: { id: pedido.id }, data: { estado: "REQUIERE_REVISION" } });
    return "revision-pago-real";
  }

  if (Math.round(pago.monto) !== pedido.total || pago.moneda !== MONEDA) {
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
      pasarelaTransaccionId: pago.id,
      metodoPago: pago.metodo,
      pagadoEn: ahora,
    },
  });
  if (pedido.carritoId)
    await tx.lineaCarrito.deleteMany({ where: { carritoId: pedido.carritoId } });
  return "pagado";
}

/** Registra un aviso que no se pudo aceptar (firma inválida, forma desconocida o pago no encontrado). */
export async function registrarAvisoRechazado(
  bd: PrismaClient,
  { transaccionId = null, resultado }: { transaccionId?: string | null; resultado: string },
): Promise<void> {
  await bd.eventoPago.create({
    data: { proveedor: "mercadopago", transaccionId, resultado },
  });
}
