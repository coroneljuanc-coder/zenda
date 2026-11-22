import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { BotonPagar } from "@/components/compra/BotonPagar";
import { TotalesCompra } from "@/components/compra/TotalesCompra";
import { obtenerBD } from "@/lib/bd";
import { consultarCarrito } from "@/lib/carrito/consulta";
import { COOKIE_CARRITO } from "@/lib/carrito/cookie";
import { calcularTotal } from "@/lib/carrito/precios";
import { leerDatosEntrega } from "@/lib/compra/entrega";
import { formatearCOP } from "@/lib/formato";

export const metadata: Metadata = {
  title: "Revisa tu pedido",
  robots: { index: false, follow: false },
};

/** Resumen final antes de pagar (ZTV-19, escenario 1): datos, productos y total. */
export default function PaginaResumen() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Revisa tu pedido</h1>
      <Suspense
        fallback={
          <p className="mt-8 text-gris" role="status">
            Cargando…
          </p>
        }
      >
        <ContenidoResumen />
      </Suspense>
    </>
  );
}

async function ContenidoResumen() {
  await connection();
  const bd = obtenerBD();
  const token = (await cookies()).get(COOKIE_CARRITO)?.value;
  const carrito = await consultarCarrito(bd, token);
  if (!carrito.puedeContinuar) redirect("/carrito");
  const datos = await leerDatosEntrega(bd, token);
  if (!datos) redirect("/compra");

  const lineas = carrito.lineas.filter((l) => l.disponible);
  const total = calcularTotal(carrito.subtotal);

  return (
    <div className="mt-8 grid gap-10 md:grid-cols-[1fr_20rem] md:items-start">
      <div className="flex flex-col gap-8">
        <section aria-labelledby="titulo-datos">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="titulo-datos" className="text-xl font-extrabold">
              Envío a
            </h2>
            <Link href="/compra" className="min-h-11 underline underline-offset-4">
              Editar datos
            </Link>
          </div>
          <address className="mt-3 not-italic leading-relaxed" data-prueba="datos-entrega">
            <span className="font-semibold">{datos.nombreCompleto}</span>
            <br />
            {datos.direccion}
            {datos.detalles && `, ${datos.detalles}`}
            <br />
            {datos.ciudadNombre}, {datos.departamentoNombre}
            <br />
            {datos.correo} · {datos.celular}
          </address>
          {datos.notas && <p className="mt-2 text-sm text-gris">Notas: {datos.notas}</p>}
        </section>

        <section aria-labelledby="titulo-productos">
          <h2 id="titulo-productos" className="text-xl font-extrabold">
            Productos
          </h2>
          <ul className="mt-3 border-y border-linea">
            {lineas.map((linea) => (
              <li
                key={linea.id}
                className="flex justify-between gap-4 border-b border-linea py-3 last:border-b-0"
                data-prueba="linea-resumen"
              >
                <span>
                  {linea.cantidad} × {linea.producto}
                  {linea.variante && (
                    <span className="block text-sm text-gris">{linea.variante}</span>
                  )}
                </span>
                <span className="shrink-0 font-semibold">{formatearCOP(linea.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <TotalesCompra unidades={carrito.unidades} subtotal={carrito.subtotal} envio={carrito.envio}>
        <div className="mt-6">
          <BotonPagar total={total} />
        </div>
      </TotalesCompra>
    </div>
  );
}
