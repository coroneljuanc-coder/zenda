"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { obtenerBD } from "@/lib/bd";
import {
  agregarAlCarrito as agregarEnBase,
  cambiarCantidad as cambiarEnBase,
  eliminarLinea as eliminarEnBase,
} from "@/lib/carrito/carrito";
import { COOKIE_CARRITO, opcionesCookieCarrito } from "@/lib/carrito/cookie";
import { MAXIMO_POR_LINEA, textoAgregado } from "@/lib/carrito/reglas";

/**
 * Acciones del carrito que el navegador puede llamar (ZTV-16). Todo se valida aquí, en el
 * servidor: una petición hecha a mano no puede saltarse las reglas del botón (RN4, seguridad).
 */

const EntradaAgregar = z.object({
  varianteId: z.string().min(1).max(64),
  cantidad: z.number().int().min(1).max(MAXIMO_POR_LINEA),
});

export type RespuestaAgregar =
  { ok: true; aviso: string; unidadesEnCarrito: number } | { ok: false; mensaje: string };

export async function agregarAlCarrito(entrada: unknown): Promise<RespuestaAgregar> {
  const datos = EntradaAgregar.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, mensaje: "No pudimos agregar este producto. Revisa la cantidad." };
  }

  const almacen = await cookies();
  const resultado = await agregarEnBase(obtenerBD(), {
    token: almacen.get(COOKIE_CARRITO)?.value,
    ...datos.data,
  });
  if (!resultado.ok) return { ok: false, mensaje: resultado.mensaje };

  // Se vuelve a guardar en cada cambio para que la cookie dure 30 días desde el último (RN5).
  almacen.set(COOKIE_CARRITO, resultado.token, opcionesCookieCarrito());
  // Vuelve a dibujar la página actual para que el contador del encabezado muestre las unidades.
  refresh();
  return {
    ok: true,
    aviso: textoAgregado(resultado.cantidad, resultado.producto),
    unidadesEnCarrito: resultado.unidadesEnCarrito,
  };
}

const EntradaCambiar = z.object({
  lineaId: z.string().min(1).max(64),
  cantidad: z.number().int().min(1).max(MAXIMO_POR_LINEA),
});

export type RespuestaCambiar =
  { ok: true; cantidad: number } | { ok: false; mensaje: string; cantidad: number | null };

/** ZTV-18, escenarios 1 y 4: cambia la cantidad de una línea del carrito del visitante. */
export async function cambiarCantidad(entrada: unknown): Promise<RespuestaCambiar> {
  const datos = EntradaCambiar.safeParse(entrada);
  if (!datos.success) {
    return { ok: false, mensaje: "No pudimos cambiar la cantidad.", cantidad: null };
  }
  const token = (await cookies()).get(COOKIE_CARRITO)?.value;
  const resultado = await cambiarEnBase(obtenerBD(), { token, ...datos.data });
  // Totales, subtotal y contador del encabezado se vuelven a dibujar sin recargar la página.
  refresh();
  return resultado.ok ? { ok: true, cantidad: resultado.cantidad } : resultado;
}

const EntradaEliminar = z.object({ lineaId: z.string().min(1).max(64) });

export type RespuestaEliminar =
  | { ok: true; producto: string; varianteId: string; cantidad: number }
  | { ok: false; mensaje: string };

/** ZTV-18, escenario 2: quita una línea; devuelve lo necesario para «Deshacer». */
export async function eliminarDelCarrito(entrada: unknown): Promise<RespuestaEliminar> {
  const datos = EntradaEliminar.safeParse(entrada);
  if (!datos.success) return { ok: false, mensaje: "No pudimos quitar este producto." };
  const token = (await cookies()).get(COOKIE_CARRITO)?.value;
  const resultado = await eliminarEnBase(obtenerBD(), { token, ...datos.data });
  refresh();
  return resultado;
}

/**
 * ZTV-18, RN2: «Deshacer» devuelve la misma variante y cantidad si sigue habiendo stock. Usa las
 * mismas reglas que «Agregar al carrito»; si ya no alcanza, explica por qué.
 */
export async function deshacerEliminacion(entrada: unknown): Promise<RespuestaAgregar> {
  return agregarAlCarrito(entrada);
}
