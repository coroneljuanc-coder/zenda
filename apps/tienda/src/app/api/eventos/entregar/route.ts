import { obtenerBD } from "@/lib/bd";
import { entregarEventosPendientes, leerConfigEventos } from "@/lib/eventos/bandeja";

/**
 * Reintento de la entrega de eventos (ZTV-25, escenario 2). Lo llama cada 15 minutos la tarea
 * programada de GitHub Actions (.github/workflows/entregar-eventos.yml). No recibe datos ni
 * devuelve datos de pedidos, solo cuántos eventos se entregaron: llamarlo de más no hace daño.
 */
export async function POST(): Promise<Response> {
  const config = leerConfigEventos();
  if (!config) {
    console.error(
      "[ALERTA] Faltan URL_NOTIFICACIONES o ZENDA_SECRETO_EVENTOS: los eventos esperan",
    );
    return Response.json({ ok: false }, { status: 503 });
  }
  const resultado = await entregarEventosPendientes(obtenerBD(), config);
  return Response.json({ ok: true, ...resultado });
}
