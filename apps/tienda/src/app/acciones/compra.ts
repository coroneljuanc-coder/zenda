"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { obtenerBD } from "@/lib/bd";
import { COOKIE_CARRITO } from "@/lib/carrito/cookie";
import { consultarCarrito } from "@/lib/carrito/consulta";
import { validarDatosEntrega, type ErroresEntrega } from "@/lib/compra/datos-entrega";
import { guardarDatosEntrega as guardarEnBase } from "@/lib/compra/entrega";
import { MENSAJE_WOMPI_NO_DISPONIBLE } from "@/lib/compra/mensajes";
import { cancelarPedido, crearPedido } from "@/lib/compra/pedido";
import { leerConfigWompi, urlCheckout, wompiDisponible } from "@/lib/compra/wompi";

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

const EntradaPagar = z.object({ totalVisto: z.number().int().positive() });

export type RespuestaPagar =
  { ok: true; url: string } | { ok: false; irA: string } | { ok: false; mensaje: string };

/** Dirección pública de la tienda en esta petición, para que Wompi devuelva al cliente aquí. */
async function urlBase(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

/**
 * ZTV-20: crea el pedido con lo que el cliente vio en el resumen y devuelve la dirección del pago
 * en Wompi. Si el catálogo cambió, vuelve al carrito (escenario 2); si Wompi no responde, el
 * pedido queda «Cancelado» y el carrito sigue intacto (escenario 3).
 */
export async function pagar(entrada: unknown): Promise<RespuestaPagar> {
  const datos = EntradaPagar.safeParse(entrada);
  if (!datos.success) return { ok: false, irA: "/compra/resumen" };

  const bd = obtenerBD();
  const token = (await cookies()).get(COOKIE_CARRITO)?.value;
  const resultado = await crearPedido(bd, { token, totalVisto: datos.data.totalVisto });
  if (!resultado.ok) {
    if (resultado.motivo === "catalogo-cambio") return { ok: false, irA: "/carrito?aviso=cambios" };
    if (resultado.motivo === "sin-datos") return { ok: false, irA: "/compra" };
    return { ok: false, irA: "/carrito" };
  }

  const { pedido } = resultado;
  const config = leerConfigWompi();
  if (!config || !(await wompiDisponible(config))) {
    // Sin llaves de prueba configuradas o sin conexión: no se envía al cliente a un pago roto.
    await cancelarPedido(bd, pedido.id);
    console.error(
      `Wompi no disponible para el pedido ${pedido.referencia}${config ? "" : " (faltan las llaves de prueba)"}`,
    );
    return { ok: false, mensaje: MENSAJE_WOMPI_NO_DISPONIBLE };
  }

  const regreso = new URL("/pedido/resultado", await urlBase());
  regreso.searchParams.set("ref", pedido.referencia);
  regreso.searchParams.set("t", pedido.tokenAcceso);
  return {
    ok: true,
    url: urlCheckout(config, {
      referencia: pedido.referencia,
      total: pedido.total,
      urlRegreso: regreso.toString(),
    }),
  };
}
