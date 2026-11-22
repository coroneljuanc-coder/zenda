import { randomBytes } from "node:crypto";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Fecha AAAAMMDD en la hora de Colombia, para que la referencia coincida con el día del cliente. */
function fechaBogota(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${valor("year")}${valor("month")}${valor("day")}`;
}

/**
 * RN3 de ZTV-20: referencia del pedido con el formato ZEN-AAAAMMDD-XXXXX (5 caracteres
 * alfanuméricos aleatorios). La base de datos garantiza que sea única.
 */
export function generarReferencia(fecha = new Date(), bytes = randomBytes(5)): string {
  const sufijo = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
  return `ZEN-${fechaBogota(fecha)}-${sufijo}`;
}

export const FORMATO_REFERENCIA = /^ZEN-\d{8}-[A-Z0-9]{5}$/;

/** Token aleatorio para consultar el resultado del pedido sin exponer datos (ZTV-22). */
export function generarTokenAcceso(): string {
  return randomBytes(24).toString("base64url");
}
