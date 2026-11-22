import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { CarritoCargando, CarritoVacio, VistaCarrito } from "@/components/carrito/VistaCarrito";
import { ZonaCarrito } from "@/components/carrito/ZonaCarrito";
import { obtenerBD } from "@/lib/bd";
import { consultarCarrito } from "@/lib/carrito/consulta";
import { COOKIE_CARRITO } from "@/lib/carrito/cookie";
import { MENSAJE_CARRITO_ACTUALIZADO } from "@/lib/compra/mensajes";

/** El carrito es de cada visitante: no se muestra en buscadores. */
export const metadata: Metadata = { title: "Tu carrito", robots: { index: false, follow: true } };

/** Página del carrito (ZTV-17): `/carrito`. */
export default function PaginaCarrito({ searchParams }: PageProps<"/carrito">) {
  return (
    <Suspense fallback={<CarritoCargando />}>
      <ContenidoCarrito searchParams={searchParams} />
    </Suspense>
  );
}

/**
 * Se arma en cada visita: lee la cookie del carrito y los precios y el stock vigentes (RN6 de
 * ZTV-16). Puede corregir la cantidad si el stock bajó (RN4), por eso nunca se prepara por adelantado.
 */
async function ContenidoCarrito({ searchParams }: Pick<PageProps<"/carrito">, "searchParams">) {
  await connection();
  const token = (await cookies()).get(COOKIE_CARRITO)?.value;
  const carrito = await consultarCarrito(obtenerBD(), token);
  // ZTV-20, escenario 2: el catálogo cambió entre el resumen y «Pagar».
  const cambios = (await searchParams).aviso === "cambios";
  // ZonaCarrito conserva el aviso «Eliminaste…» aunque el carrito quede vacío (ZTV-18, RN3).
  return (
    <ZonaCarrito>
      {cambios && (
        <p
          role="alert"
          className="mb-6 border-l-4 border-tinta bg-superficie p-3 font-semibold"
          data-prueba="aviso-cambios"
        >
          {MENSAJE_CARRITO_ACTUALIZADO}
        </p>
      )}
      {carrito.lineas.length === 0 ? <CarritoVacio /> : <VistaCarrito carrito={carrito} />}
    </ZonaCarrito>
  );
}
