import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { CarritoCargando, CarritoVacio, VistaCarrito } from "@/components/carrito/VistaCarrito";
import { ZonaCarrito } from "@/components/carrito/ZonaCarrito";
import { obtenerBD } from "@/lib/bd";
import { consultarCarrito } from "@/lib/carrito/consulta";
import { COOKIE_CARRITO } from "@/lib/carrito/cookie";

/** El carrito es de cada visitante: no se muestra en buscadores. */
export const metadata: Metadata = { title: "Tu carrito", robots: { index: false, follow: true } };

/** Página del carrito (ZTV-17): `/carrito`. */
export default function PaginaCarrito() {
  return (
    <Suspense fallback={<CarritoCargando />}>
      <ContenidoCarrito />
    </Suspense>
  );
}

/**
 * Se arma en cada visita: lee la cookie del carrito y los precios y el stock vigentes (RN6 de
 * ZTV-16). Puede corregir la cantidad si el stock bajó (RN4), por eso nunca se prepara por adelantado.
 */
async function ContenidoCarrito() {
  await connection();
  const token = (await cookies()).get(COOKIE_CARRITO)?.value;
  const carrito = await consultarCarrito(obtenerBD(), token);
  // ZonaCarrito conserva el aviso «Eliminaste…» aunque el carrito quede vacío (ZTV-18, RN3).
  return (
    <ZonaCarrito>
      {carrito.lineas.length === 0 ? <CarritoVacio /> : <VistaCarrito carrito={carrito} />}
    </ZonaCarrito>
  );
}
