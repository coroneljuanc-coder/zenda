import { createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { consultarCarrito } from "../carrito/consulta";
import { calcularTotal } from "../carrito/precios";
import { generarReferencia, generarTokenAcceso } from "./referencia";

/**
 * Crear el pedido al tocar «Pagar» (ZTV-20, COM-02). Recibe el cliente de base de datos para poder
 * probarse contra una base de prueba.
 */

/** Escenario 4: dentro de este tiempo, el mismo contenido reutiliza el pedido pendiente. */
const VENTANA_DOBLE_CLIC_MS = 2 * 60 * 1000;
const INTENTOS_REFERENCIA = 3;

export type PedidoCreado = {
  id: string;
  referencia: string;
  tokenAcceso: string;
  total: number;
  reutilizado: boolean;
};

export type ResultadoCrearPedido =
  | { ok: true; pedido: PedidoCreado }
  | { ok: false; motivo: "sin-carrito" | "sin-datos" | "catalogo-cambio" };

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

function esReferenciaRepetida(error: unknown): boolean {
  const e = error as { code?: string; meta?: { target?: unknown; modelName?: string } };
  return e?.code === "P2002" && JSON.stringify(e.meta ?? {}).includes("referencia");
}

/**
 * RN1: revalida en el servidor precio, stock y estado de cada línea contra lo que vio el cliente
 * (`totalVisto`); si algo cambió, no crea nada (escenario 2).
 * RN2: guarda una copia de las líneas, los totales y los datos de entrega.
 * RN5: no descuenta inventario ni vacía el carrito.
 * RN6 y escenario 4: cancela el pedido pendiente anterior del carrito, salvo que sea el mismo
 * contenido de hace menos de 2 minutos (un doble clic), que se reutiliza.
 */
export async function crearPedido(
  bd: PrismaClient,
  {
    token,
    totalVisto,
    ahora = new Date(),
    referencia = generarReferencia,
  }: {
    token: string | null | undefined;
    totalVisto: number;
    ahora?: Date;
    referencia?: (fecha: Date) => string;
  },
): Promise<ResultadoCrearPedido> {
  for (let intento = 1; ; intento++) {
    try {
      return await bd.$transaction(
        (tx) => crearEnTransaccion(tx, { token, totalVisto, ahora, referencia }),
        { timeout: 15_000 },
      );
    } catch (error) {
      // RN3: si la referencia aleatoria ya existe, se genera otra.
      if (esReferenciaRepetida(error) && intento < INTENTOS_REFERENCIA) continue;
      throw error;
    }
  }
}

async function crearEnTransaccion(
  tx: Tx,
  {
    token,
    totalVisto,
    ahora,
    referencia,
  }: {
    token: string | null | undefined;
    totalVisto: number;
    ahora: Date;
    referencia: (f: Date) => string;
  },
): Promise<ResultadoCrearPedido> {
  if (!token) return { ok: false, motivo: "sin-carrito" };
  const carrito = await tx.carrito.findUnique({
    where: { token },
    select: { id: true, expiraEn: true, datosEntrega: true },
  });
  if (!carrito || carrito.expiraEn <= ahora) return { ok: false, motivo: "sin-carrito" };

  // Bloquea el carrito hasta el final: dos «Pagar» simultáneos se atienden uno tras otro.
  await tx.$queryRaw`SELECT id FROM "Carrito" WHERE id = ${carrito.id} FOR UPDATE`;

  const vista = await consultarCarrito(tx as unknown as PrismaClient, token, ahora, {
    guardarAjustes: false,
  });
  const disponibles = vista.lineas.filter((l) => l.disponible);
  const total = calcularTotal(vista.subtotal);
  const cambio = disponibles.some((l) => l.avisos.length > 0) || total !== totalVisto;
  if (!vista.puedeContinuar || cambio) return { ok: false, motivo: "catalogo-cambio" };

  const datos = carrito.datosEntrega;
  if (!datos) return { ok: false, motivo: "sin-datos" };

  const claveContenido = createHash("sha256")
    .update(JSON.stringify([disponibles.map((l) => [l.varianteId, l.cantidad, l.precio]), total]))
    .digest("hex");

  const pendientes = await tx.pedido.findMany({
    where: { carritoId: carrito.id, estado: "PENDIENTE_PAGO" },
    select: {
      id: true,
      referencia: true,
      tokenAcceso: true,
      total: true,
      claveContenido: true,
      creadoEn: true,
    },
  });
  const mismo = pendientes.find(
    (p) =>
      p.claveContenido === claveContenido &&
      ahora.getTime() - p.creadoEn.getTime() < VENTANA_DOBLE_CLIC_MS,
  );
  if (mismo) {
    return {
      ok: true,
      pedido: {
        id: mismo.id,
        referencia: mismo.referencia,
        tokenAcceso: mismo.tokenAcceso,
        total: mismo.total,
        reutilizado: true,
      },
    };
  }
  if (pendientes.length > 0) {
    await tx.pedido.updateMany({
      where: { id: { in: pendientes.map((p) => p.id) } },
      data: { estado: "CANCELADO" },
    });
  }

  const pedido = await tx.pedido.create({
    data: {
      referencia: referencia(ahora),
      tokenAcceso: generarTokenAcceso(),
      subtotal: vista.subtotal,
      envio: vista.envio,
      total,
      claveContenido,
      nombreCompleto: datos.nombreCompleto,
      correo: datos.correo,
      celular: datos.celular,
      departamento: datos.departamento,
      ciudad: datos.ciudad,
      codigoDane: datos.codigoDane,
      direccion: datos.direccion,
      detalles: datos.detalles,
      notas: datos.notas,
      carritoId: carrito.id,
      creadoEn: ahora,
      lineas: {
        create: disponibles.map((l) => ({
          varianteId: l.varianteId,
          nombreProducto: l.producto,
          descripcionVariante: l.variante,
          precioUnitario: l.precio,
          cantidad: l.cantidad,
          totalLinea: l.total,
        })),
      },
    },
    select: { id: true, referencia: true, tokenAcceso: true, total: true },
  });
  return { ok: true, pedido: { ...pedido, reutilizado: false } };
}

/** Escenario 3 de ZTV-20 (4 de ZTV-86): si la pasarela no responde, el pedido queda «Cancelado» y el carrito sigue intacto. */
export async function cancelarPedido(bd: PrismaClient, id: string): Promise<void> {
  await bd.pedido.updateMany({
    where: { id, estado: "PENDIENTE_PAGO" },
    data: { estado: "CANCELADO" },
  });
}
