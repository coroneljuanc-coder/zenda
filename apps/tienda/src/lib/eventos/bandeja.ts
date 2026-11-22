import {
  ENCABEZADO_FIRMA,
  EsquemaDatosPedidoPagado,
  TIPO_PEDIDO_PAGADO,
  VERSION_PEDIDO_PAGADO,
  firmarEvento,
  type DatosPedidoPagado,
  type EventoPedidoPagado,
} from "@zenda/contratos";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/**
 * Bandeja de salida de eventos de la tienda (ZTV-25, patrón «outbox»).
 * - RN1: el evento «pedido.pagado» se guarda en la misma transacción que marca el pedido «Pagado».
 * - RN2: el pago nunca espera la entrega; se entrega después, con reintentos.
 * - Escenario 2: si el servicio no responde, se reintenta con espera creciente hasta 24 horas;
 *   después queda «Fallido» con una alerta.
 */

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/** Copia de los datos del pedido que necesitan los correos (RN5): nunca datos de pago. */
export async function datosPedidoPagado(tx: Tx, pedidoId: string): Promise<DatosPedidoPagado> {
  const p = await tx.pedido.findUniqueOrThrow({
    where: { id: pedidoId },
    include: { lineas: { orderBy: { id: "asc" } } },
  });
  return EsquemaDatosPedidoPagado.parse({
    referencia: p.referencia,
    cliente: { nombre: p.nombreCompleto, correo: p.correo, celular: p.celular },
    entrega: {
      departamento: p.departamento,
      ciudad: p.ciudad,
      direccion: p.direccion,
      detalles: p.detalles,
      notas: p.notas,
    },
    lineas: p.lineas.map((l) => ({
      nombreProducto: l.nombreProducto,
      descripcionVariante: l.descripcionVariante,
      precioUnitario: l.precioUnitario,
      cantidad: l.cantidad,
      totalLinea: l.totalLinea,
    })),
    subtotal: p.subtotal,
    envio: p.envio,
    total: p.total,
    metodoPago: p.metodoPago,
    pagadoEn: (p.pagadoEn ?? new Date()).toISOString(),
  });
}

/** RN1: guarda el evento en la bandeja, dentro de la transacción del pago. Uno por pedido. */
export async function publicarPedidoPagado(tx: Tx, pedidoId: string, ahora: Date): Promise<void> {
  const datos = await datosPedidoPagado(tx, pedidoId);
  await tx.eventoSaliente.upsert({
    where: { pedidoId },
    update: {},
    create: {
      tipo: TIPO_PEDIDO_PAGADO,
      version: VERSION_PEDIDO_PAGADO,
      datos: datos as Prisma.InputJsonValue,
      pedidoId,
      ocurridoEn: ahora,
      proximoIntento: ahora,
    },
  });
}

export type ConfigEventos = { url: string; secreto: string };

/** Dirección del servicio y clave compartida (RN4). `null` si falta algo: el evento espera. */
export function leerConfigEventos(
  entorno: Record<string, string | undefined> = process.env,
): ConfigEventos | null {
  const base = entorno.URL_NOTIFICACIONES?.trim();
  const secreto = entorno.ZENDA_SECRETO_EVENTOS?.trim();
  if (!base || !secreto) return null;
  return { url: new URL("/api/eventos", base).toString(), secreto };
}

/** Espera antes del siguiente intento: 1, 5, 15 y 30 minutos, y luego cada hora. */
export function esperaReintento(intentos: number): number {
  const minutos = [1, 5, 15, 30][intentos - 1] ?? 60;
  return minutos * 60_000;
}

/** Plazo máximo de reintentos (escenario 2): 24 horas desde que ocurrió el evento. */
export const PLAZO_ENTREGA_MS = 24 * 60 * 60_000;

/** Tiempo que un proceso «reserva» un evento mientras lo entrega, para no entregarlo dos veces. */
const RESERVA_MS = 2 * 60_000;

export type ResultadoEntrega = { entregados: number; reintentar: number; fallidos: number };

/**
 * Entrega los eventos pendientes al servicio de Notificaciones. Seguro de correr varias veces a la
 * vez: cada evento se reserva con `FOR UPDATE SKIP LOCKED` antes de enviarlo.
 */
export async function entregarEventosPendientes(
  bd: PrismaClient,
  config: ConfigEventos,
  { ahora = new Date(), enviar = fetch, limite = 10 } = {},
): Promise<ResultadoEntrega> {
  const reserva = new Date(ahora.getTime() + RESERVA_MS);
  const reservados = await bd.$queryRaw<
    {
      id: string;
      tipo: string;
      version: number;
      datos: unknown;
      ocurridoEn: Date;
      intentos: number;
    }[]
  >`
    UPDATE "EventoSaliente" SET "proximoIntento" = ${reserva}
    WHERE id IN (
      SELECT id FROM "EventoSaliente"
      WHERE estado = 'PENDIENTE' AND "proximoIntento" <= ${ahora}
      ORDER BY "ocurridoEn"
      LIMIT ${limite}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, tipo, version, datos, "ocurridoEn", intentos`;

  const resultado: ResultadoEntrega = { entregados: 0, reintentar: 0, fallidos: 0 };
  for (const e of reservados) {
    const evento = {
      id: e.id,
      tipo: e.tipo,
      version: e.version,
      ocurridoEn: e.ocurridoEn.toISOString(),
      datos: e.datos,
    } as EventoPedidoPagado;
    const cuerpo = JSON.stringify(evento);
    let error: string | null = null;
    let permanente = false;
    try {
      const r = await enviar(config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [ENCABEZADO_FIRMA]: firmarEvento(cuerpo, config.secreto, ahora),
        },
        body: cuerpo,
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      });
      if (!r.ok) {
        error = `HTTP ${r.status}`;
        // 400: el servicio dice que el evento no cumple el contrato; reintentar no lo arregla.
        permanente = r.status === 400;
      }
    } catch (causa) {
      error = causa instanceof Error ? causa.message : "sin respuesta";
    }

    const intentos = e.intentos + 1;
    if (!error) {
      await bd.eventoSaliente.update({
        where: { id: e.id },
        data: { estado: "ENTREGADO", intentos, entregadoEn: ahora, ultimoError: null },
      });
      resultado.entregados++;
    } else if (permanente || ahora.getTime() - e.ocurridoEn.getTime() >= PLAZO_ENTREGA_MS) {
      await bd.eventoSaliente.update({
        where: { id: e.id },
        data: { estado: "FALLIDO", intentos, ultimoError: error },
      });
      console.error(
        `[ALERTA] El evento ${e.tipo} ${e.id} no se pudo entregar a Notificaciones (${error}).`,
      );
      resultado.fallidos++;
    } else {
      await bd.eventoSaliente.update({
        where: { id: e.id },
        data: {
          intentos,
          ultimoError: error,
          proximoIntento: new Date(ahora.getTime() + esperaReintento(intentos)),
        },
      });
      resultado.reintentar++;
    }
  }
  return resultado;
}
