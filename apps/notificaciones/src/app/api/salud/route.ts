import { RESPUESTA_SALUD_OK } from "@zenda/contratos";
import { baseDisponible, obtenerBD } from "../../../lib/bd";

/**
 * Chequeo de salud del servicio de Notificaciones.
 * - `GET /api/salud`: el servicio está en línea (no toca la base).
 * - `GET /api/salud?bd=1` (ZTV-91): además confirma que la base de datos responde; si no, 503 sin
 *   detalles de la conexión.
 */
export async function GET(peticion: Request) {
  if (new URL(peticion.url).searchParams.get("bd") !== "1") {
    return Response.json(RESPUESTA_SALUD_OK);
  }
  let disponible = false;
  try {
    disponible = await baseDisponible(obtenerBD());
  } catch {
    disponible = false;
  }
  if (!disponible) {
    console.error("[ALERTA] La base de datos de Notificaciones no responde");
    return Response.json({ estado: "sin-base" }, { status: 503 });
  }
  return Response.json(RESPUESTA_SALUD_OK);
}
