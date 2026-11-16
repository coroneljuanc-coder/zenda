const FORMATO_COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Da formato de pesos colombianos a un valor entero: 89900 → "$ 89.900".
 *
 * Los precios de Zenda se guardan como enteros en COP, sin centavos e IVA incluido (D4).
 * Intl separa el símbolo con un espacio no separable; se cambia por un espacio normal
 * para que el texto sea igual en pantallas, correos y pruebas.
 */
export function formatearCOP(valor: number): string {
  if (!Number.isInteger(valor)) {
    throw new RangeError(`formatearCOP: el valor debe ser un entero de pesos y llegó ${valor}`);
  }
  return FORMATO_COP.format(valor).replace(/ /g, " ");
}
