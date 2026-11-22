import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FormularioEntrega, VALORES_VACIOS } from "@/components/compra/FormularioEntrega";
import { TotalesCompra } from "@/components/compra/TotalesCompra";
import { obtenerBD } from "@/lib/bd";
import { consultarCarrito } from "@/lib/carrito/consulta";
import { COOKIE_CARRITO } from "@/lib/carrito/cookie";
import { leerDatosEntrega } from "@/lib/compra/entrega";

export const metadata: Metadata = {
  title: "Tus datos de envío",
  robots: { index: false, follow: false },
};

/** Paso 1 de la compra (ZTV-19): datos de contacto y dirección de entrega. */
export default function PaginaCompra() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Tus datos de envío</h1>
      <p className="mt-2 text-gris">
        Compra sin crear una cuenta. Usamos estos datos solo para tu pedido.
      </p>
      <Suspense
        fallback={
          <p className="mt-8 text-gris" role="status">
            Cargando…
          </p>
        }
      >
        <ContenidoCompra />
      </Suspense>
    </>
  );
}

async function ContenidoCompra() {
  await connection();
  const bd = obtenerBD();
  const token = (await cookies()).get(COOKIE_CARRITO)?.value;
  const carrito = await consultarCarrito(bd, token);
  // Escenario 4: sin productos disponibles no hay compra.
  if (!carrito.puedeContinuar) redirect("/carrito");

  const guardados = await leerDatosEntrega(bd, token);
  // Escenario 2: si ya había datos, el formulario vuelve diligenciado.
  const inicial = guardados
    ? {
        ...VALORES_VACIOS,
        ...guardados,
        detalles: guardados.detalles ?? "",
        notas: guardados.notas ?? "",
        aceptoPolitica: true,
      }
    : VALORES_VACIOS;

  return (
    <div className="mt-8 grid gap-10 md:grid-cols-[1fr_20rem] md:items-start">
      <FormularioEntrega inicial={inicial} />
      <TotalesCompra
        unidades={carrito.unidades}
        subtotal={carrito.subtotal}
        envio={carrito.envio}
      />
    </div>
  );
}
