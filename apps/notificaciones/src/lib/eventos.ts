import {
  ENCABEZADO_FIRMA,
  EsquemaEventoPedidoPagado,
  huellaClave,
  verificarFirmaEvento,
  type EventoPedidoPagado,
} from "@zenda/contratos";
import type { PrismaClient } from "../generated/prisma/client";

/**
 * Recepción de eventos de la tienda (ZTV-25).
 * - Escenario 3: firma inválida o vencida → 401; forma que no cumple el contrato → 400. Nada se
 *   registra y no sale ningún correo.
 * - Escenario 4 y RN3: cada id se procesa una sola vez; un repetido responde «recibido» sin más.
 */
export type ResultadoRecepcion =
  { estado: 200; nuevo: boolean; evento: EventoPedidoPagado } | { estado: 400 | 401 };

export async function recibirEvento(
  bd: PrismaClient,
  { cuerpo, encabezados }: { cuerpo: string; encabezados: Headers },
  { secreto, ahora = new Date() }: { secreto: string; ahora?: Date },
): Promise<ResultadoRecepcion> {
  const firma = verificarFirmaEvento(cuerpo, encabezados.get(ENCABEZADO_FIRMA), secreto, ahora);
  if (firma !== "valida") {
    console.error(
      `[ALERTA] Evento rechazado: firma ${firma} (huella de la clave: ${huellaClave(secreto)})`,
    );
    return { estado: 401 };
  }

  let json: unknown;
  try {
    json = JSON.parse(cuerpo);
  } catch {
    json = null;
  }
  const r = EsquemaEventoPedidoPagado.safeParse(json);
  if (!r.success) {
    console.error("[ALERTA] Evento rechazado: no cumple el contrato pedido.pagado v1");
    return { estado: 400 };
  }
  const evento = r.data;

  // RN3: el id es la llave primaria; si ya existe, no se crea otro (ni se procesa de nuevo).
  const creados = await bd.eventoRecibido.createMany({
    data: [
      {
        id: evento.id,
        tipo: evento.tipo,
        version: evento.version,
        ocurridoEn: new Date(evento.ocurridoEn),
        datos: evento.datos,
      },
    ],
    skipDuplicates: true,
  });
  return { estado: 200, nuevo: creados.count === 1, evento };
}
