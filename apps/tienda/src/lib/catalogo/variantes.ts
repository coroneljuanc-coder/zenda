/**
 * Reglas de la selección de talla y color en la ficha (ZTV-15, CAT-06). Funciones puras: no
 * tocan la base ni la pantalla, para probarlas con valores límite.
 */

/** Una variante como la ve la ficha. `precio` ya resuelto: el propio o, si no tiene, el del producto (RN1). */
export type VarianteFicha = {
  id: string;
  sku: string;
  talla: string | null;
  color: string | null;
  stock: number;
  precio: number;
};

export type Atributo = "talla" | "color";

/** Lo que el visitante tiene elegido; `null` es «sin elegir». */
export type Seleccion = { talla: string | null; color: string | null };

/** Estado de la selección para el área de compra. */
export type EstadoSeleccion =
  | { tipo: "incompleta"; faltan: Atributo[] }
  /** La combinación existe con stock 0 o no existe (RN2: se puede ver, no agregar). */
  | { tipo: "agotada"; variante: VarianteFicha | null }
  | { tipo: "lista"; variante: VarianteFicha };

const ORDEN_TALLAS = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/**
 * RN3: tallas en orden lógico, no alfabético. Primero las de letra (XS, S, M, L, XL…), luego las
 * numéricas de menor a mayor (28, 30, 32; también «500 ml», «750 ml») y al final cualquier otra,
 * en orden alfabético. Sin repetidas.
 */
export function ordenarTallas(tallas: string[]): string[] {
  const clave = (talla: string): [number, number] => {
    const letra = ORDEN_TALLAS.indexOf(talla.trim().toUpperCase());
    if (letra >= 0) return [0, letra];
    const numero = Number.parseFloat(talla.replace(",", "."));
    if (Number.isFinite(numero)) return [1, numero];
    return [2, 0];
  };
  return [...new Set(tallas)].sort((a, b) => {
    const [grupoA, valorA] = clave(a);
    const [grupoB, valorB] = clave(b);
    return grupoA - grupoB || valorA - valorB || a.localeCompare(b, "es");
  });
}

/** Las tallas (en orden lógico) y los colores (en el orden en que aparecen) de un producto. */
export function opcionesDe(variantes: VarianteFicha[]): { tallas: string[]; colores: string[] } {
  const tallas = variantes.flatMap((v) => (v.talla ? [v.talla] : []));
  const colores = variantes.flatMap((v) => (v.color ? [v.color] : []));
  return { tallas: ordenarTallas(tallas), colores: [...new Set(colores)] };
}

/**
 * Selección con la que abre la ficha:
 * - Si la dirección trae `?variante={sku}` de este producto, esa variante (para compartir el enlace).
 * - Si no, nada elegido, salvo lo que tiene una sola opción (escenario 4: el producto sin talla
 *   ni color queda con su variante única; la chaqueta, con su único color).
 */
export function seleccionInicial(variantes: VarianteFicha[], sku?: string | null): Seleccion {
  const desdeUrl = sku ? variantes.find((v) => v.sku === sku) : undefined;
  if (desdeUrl) return { talla: desdeUrl.talla, color: desdeUrl.color };
  const { tallas, colores } = opcionesDe(variantes);
  return {
    talla: tallas.length === 1 ? tallas[0] : null,
    color: colores.length === 1 ? colores[0] : null,
  };
}

/** La variante exacta de una selección completa, si existe. */
export function buscarVariante(
  variantes: VarianteFicha[],
  seleccion: Seleccion,
): VarianteFicha | null {
  return variantes.find((v) => v.talla === seleccion.talla && v.color === seleccion.color) ?? null;
}

/** Escenarios 1 a 3: qué le falta elegir al visitante o qué variante eligió. */
export function evaluarSeleccion(
  variantes: VarianteFicha[],
  seleccion: Seleccion,
): EstadoSeleccion {
  const { tallas, colores } = opcionesDe(variantes);
  const faltan: Atributo[] = [];
  if (tallas.length > 0 && !seleccion.talla) faltan.push("talla");
  if (colores.length > 0 && !seleccion.color) faltan.push("color");
  if (faltan.length > 0) return { tipo: "incompleta", faltan };

  const variante = buscarVariante(variantes, seleccion);
  if (!variante || variante.stock <= 0) return { tipo: "agotada", variante };
  return { tipo: "lista", variante };
}

/**
 * Escenario 2: una opción se muestra disponible si hay al menos una variante con stock que la
 * tenga y que combine con lo otro que ya se eligió. Si no, aparece tachada (se puede elegir, para
 * ver el aviso, pero no agregar al carrito).
 */
export function opcionDisponible(
  variantes: VarianteFicha[],
  atributo: Atributo,
  valor: string,
  seleccion: Seleccion,
): boolean {
  const otro: Atributo = atributo === "talla" ? "color" : "talla";
  return variantes.some(
    (v) =>
      v[atributo] === valor &&
      v.stock > 0 &&
      (seleccion[otro] === null || v[otro] === seleccion[otro]),
  );
}

/** Texto del aviso junto al selector que falta (escenario 3). */
export function textoFalta(atributo: Atributo): string {
  return atributo === "talla" ? "Selecciona una talla" : "Selecciona un color";
}

export const TEXTO_COMBINACION_AGOTADA = "Esta combinación está agotada";
