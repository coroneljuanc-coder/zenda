"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { obtenerBD } from "@/lib/bd";
import { agregarAlCarrito as agregarEnBase } from "@/lib/carrito/carrito";
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
