import { RESPUESTA_SALUD_OK } from "@zenda/contratos";

/** Chequeo de salud del servicio de Notificaciones: confirma que el servicio está en línea (S0-06-CP2). */
export function GET() {
  return Response.json(RESPUESTA_SALUD_OK);
}
