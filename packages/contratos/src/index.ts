/**
 * Contratos compartidos de Zenda.
 *
 * Aquí viven los "acuerdos" sobre la forma de los mensajes que se envían la tienda
 * y el servicio de Notificaciones. Es el único código que ambas aplicaciones comparten.
 * El contrato del evento "pedido.pagado" está en eventos.ts (ZTV-25).
 */

/** Respuesta del chequeo de salud de cualquier servicio de Zenda (`GET /api/salud`). */
export type RespuestaSalud = {
  estado: "ok";
};

export const RESPUESTA_SALUD_OK: RespuestaSalud = { estado: "ok" };

export * from "./eventos";
export { EVENTO_EJEMPLO as EVENTO_PEDIDO_PAGADO_EJEMPLO } from "./eventos-ejemplo";
