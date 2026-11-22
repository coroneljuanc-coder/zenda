"use server";

import { cookies } from "next/headers";
import { obtenerBD } from "@/lib/bd";
import { COOKIE_CARRITO } from "@/lib/carrito/cookie";
import { consultarCarrito } from "@/lib/carrito/consulta";
import { validarDatosEntrega, type ErroresEntrega } from "@/lib/compra/datos-entrega";
import { guardarDatosEntrega as guardarEnBase } from "@/lib/compra/entrega";

/**
 * Acciones de la compra que el navegador puede llamar (ZTV-19). El servidor vuelve a validar todo
 * con el mismo esquema que el formulario: una petición hecha a mano no se salta las reglas.
 */

export type RespuestaGuardarEntrega =
  { ok: true } | { ok: false; errores: ErroresEntrega } | { ok: false; irAlCarrito: true };

/** Escenarios 1 y 3: valida y guarda los datos de envío junto al carrito del visitante. */
export async function guardarDatosEntrega(entrada: unknown): Promise<RespuestaGuardarEntrega> {
  const validacion = validarDatosEntrega(entrada);
  if (!validacion.ok) return { ok: false, errores: validacion.errores };

  const bd = obtenerBD();
  const token = (await cookies()).get(COOKIE_CARRITO)?.value;
  // Escenario 4: sin productos disponibles no hay compra; se vuelve al carrito.
  const carrito = await consultarCarrito(bd, token);
  if (!carrito.puedeContinuar) return { ok: false, irAlCarrito: true };

  const resultado = await guardarEnBase(bd, { token, datos: validacion.datos });
  return resultado.ok ? { ok: true } : { ok: false, irAlCarrito: true };
}
