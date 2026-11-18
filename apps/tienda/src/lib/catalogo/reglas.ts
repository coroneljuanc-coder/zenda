import { formatearCOP } from "@/lib/formato";

/** Lo mínimo de una variante que necesitan las reglas del listado (ZTV-11). */
export type VarianteResumen = { stock: number; precio: number | null };

/** RN4 de ZTV-11: un producto está agotado cuando la suma del stock de sus variantes es 0. */
export function estaAgotado(variantes: VarianteResumen[]): boolean {
  return variantes.reduce((total, v) => total + v.stock, 0) <= 0;
}

/**
 * Precio que se muestra en la tarjeta. Cada variante usa su propio precio o, si no tiene,
 * el del producto. RN2: precio final en COP, «$ 89.900». RN3: si las variantes tienen precios
 * distintos, «Desde $ X» con el menor.
 */
export function textoPrecio(precioProducto: number, variantes: VarianteResumen[]): string {
  const precios = variantes.map((v) => v.precio ?? precioProducto);
  if (precios.length === 0) return formatearCOP(precioProducto);
  const menor = Math.min(...precios);
  const distintos = new Set(precios).size > 1;
  return distintos ? `Desde ${formatearCOP(menor)}` : formatearCOP(menor);
}

export const PRODUCTOS_POR_PAGINA = 12;

/**
 * Lee el número de página de la dirección (`?pagina=2`). Cualquier valor que no sea un entero
 * positivo (vacío, texto, 0, negativo, decimal) se trata como la página 1.
 */
export function interpretarPagina(valor: string | string[] | undefined): number {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  if (!texto || !/^\d+$/.test(texto)) return 1;
  const numero = Number(texto);
  return Number.isSafeInteger(numero) && numero >= 1 ? numero : 1;
}

/**
 * RN5 de ZTV-11: una página que no existe (`?pagina=99`) muestra la última página válida.
 * Con 0 productos hay una sola página (la del mensaje de catálogo vacío).
 */
export function ajustarPagina(pagina: number, total: number, porPagina = PRODUCTOS_POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  return { pagina: Math.min(Math.max(1, pagina), totalPaginas), totalPaginas };
}

/** Unidades disponibles de un producto: la suma del stock de sus variantes. */
export function stockTotal(variantes: VarianteResumen[]): number {
  return variantes.reduce((total, v) => total + v.stock, 0);
}

/**
 * Texto de disponibilidad de la ficha (RN2 de ZTV-13): 0 → «Agotado»; de 1 a 5 → «¡Últimas N
 * unidades!» (con 1, «¡Última unidad!»); más de 5 → «Disponible», sin mostrar el número exacto.
 */
export function textoDisponibilidad(unidades: number): string {
  if (unidades <= 0) return "Agotado";
  if (unidades === 1) return "¡Última unidad!";
  if (unidades <= 5) return `¡Últimas ${unidades} unidades!`;
  return "Disponible";
}
