/**
 * Cálculos del resumen del carrito (ZTV-17, CAR-02). Todo en pesos enteros, con IVA incluido
 * (D4). La tarifa y el umbral del envío viven aquí, en un solo lugar (D3).
 */

/** D3: envío fijo a todo el país. */
export const TARIFA_ENVIO = 12_000;

/** D3: desde este subtotal el envío es gratis. */
export const UMBRAL_ENVIO_GRATIS = 200_000;

export type LineaParaSumar = { precio: number; cantidad: number };

/** RN1: total de línea = precio unitario vigente × cantidad. */
export function totalLinea({ precio, cantidad }: LineaParaSumar): number {
  return precio * cantidad;
}

/** RN2: subtotal = suma de los totales de las líneas disponibles. */
export function calcularSubtotal(lineas: LineaParaSumar[]): number {
  return lineas.reduce((suma, linea) => suma + totalLinea(linea), 0);
}

/** RN3: $ 12.000 si el subtotal es menor que $ 200.000; gratis desde $ 200.000. Sin productos, 0. */
export function calcularEnvio(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= UMBRAL_ENVIO_GRATIS ? 0 : TARIFA_ENVIO;
}

/** Escenario 2: cuánto falta para el envío gratis (0 si ya lo tiene). */
export function faltaParaEnvioGratis(subtotal: number): number {
  return Math.max(0, UMBRAL_ENVIO_GRATIS - subtotal);
}
