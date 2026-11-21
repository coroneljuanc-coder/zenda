/**
 * Reglas del carrito (ZTV-16, CAR-01). Funciones puras, probadas con valores límite.
 */

/** RN1: máximo de unidades de una misma variante en el carrito. */
export const MAXIMO_POR_LINEA = 10;

/** RN5: un carrito dura 30 días desde su última modificación. */
export const DIAS_DE_VIGENCIA = 30;

export type ResultadoCantidad = { ok: true; total: number } | { ok: false; mensaje: string };

const unidades = (n: number) => (n === 1 ? "1 unidad disponible" : `${n} unidades disponibles`);

/**
 * RN1 y escenario 3: ¿se pueden agregar `agregar` unidades si ya hay `enCarrito` y quedan `stock`?
 * La cantidad total de la línea va de 1 al menor valor entre el stock y 10.
 */
export function validarCantidad({
  enCarrito,
  agregar,
  stock,
}: {
  enCarrito: number;
  agregar: number;
  stock: number;
}): ResultadoCantidad {
  if (!Number.isInteger(agregar) || agregar < 1) {
    return { ok: false, mensaje: "Elige al menos 1 unidad." };
  }
  if (stock <= 0) {
    return { ok: false, mensaje: "Este producto no está disponible por ahora." };
  }
  const total = enCarrito + agregar;
  if (total > stock && stock <= MAXIMO_POR_LINEA) {
    const yaTienes = enCarrito > 0 ? ` Ya tienes ${enCarrito} en tu carrito.` : "";
    return { ok: false, mensaje: `Solo hay ${unidades(stock)}.${yaTienes}` };
  }
  if (total > MAXIMO_POR_LINEA) {
    const yaTienes = enCarrito > 0 ? ` Ya tienes ${enCarrito} en tu carrito.` : "";
    return {
      ok: false,
      mensaje: `Puedes llevar hasta ${MAXIMO_POR_LINEA} unidades de cada producto.${yaTienes}`,
    };
  }
  return { ok: true, total };
}

/** Lo máximo que se puede elegir en el selector de cantidad de la ficha. */
export function cantidadMaxima(stock: number, enCarrito = 0): number {
  return Math.max(0, Math.min(stock, MAXIMO_POR_LINEA) - enCarrito);
}

/** RN5: fecha en que vence un carrito modificado en `desde`. */
export function vencimientoDesde(desde: Date): Date {
  return new Date(desde.getTime() + DIAS_DE_VIGENCIA * 24 * 60 * 60 * 1000);
}

/** Texto del aviso al agregar (escenario 1): «Agregaste 2 × Camiseta básica de algodón al carrito». */
export function textoAgregado(cantidad: number, producto: string): string {
  return `Agregaste ${cantidad} × ${producto} al carrito`;
}
