import Image from "next/image";
import Link from "next/link";
import type { CarritoVista, LineaVista } from "@/lib/carrito/consulta";
import { formatearCOP } from "@/lib/formato";

const productos = (n: number) => `${n} ${n === 1 ? "producto" : "productos"}`;

/** Página del carrito con productos (ZTV-17): líneas a la izquierda y resumen a la derecha. */
export function VistaCarrito({ carrito }: { carrito: CarritoVista }) {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">
        Tu carrito ({productos(carrito.unidades)})
      </h1>
      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_20rem] md:items-start">
        <ul aria-label="Productos en tu carrito" className="border-y border-linea">
          {carrito.lineas.map((linea) => (
            <LineaCarrito key={linea.id} linea={linea} />
          ))}
        </ul>
        <ResumenCarrito carrito={carrito} />
      </div>
    </>
  );
}

/** Una línea: foto, nombre, variante, precio unitario, cantidad y total (escenario 1). */
function LineaCarrito({ linea }: { linea: LineaVista }) {
  const enlace = `/producto/${linea.slug}?variante=${encodeURIComponent(linea.sku)}`;
  return (
    <li
      className="flex gap-4 border-b border-linea py-4 last:border-b-0"
      data-prueba="linea-carrito"
    >
      <div className="size-24 shrink-0 bg-superficie">
        {linea.imagen && (
          <Image
            src={linea.imagen.url}
            alt={linea.imagen.textoAlternativo}
            width={96}
            height={96}
            unoptimized={linea.imagen.url.endsWith(".svg")}
            className={`size-24 object-cover ${linea.disponible ? "" : "opacity-50"}`}
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={enlace} className="font-semibold underline-offset-4 hover:underline">
          {linea.producto}
        </Link>
        {linea.variante && <p className="text-sm text-gris">{linea.variante}</p>}
        <p className="text-sm">
          Precio unitario:{" "}
          <span className="font-semibold whitespace-nowrap">{formatearCOP(linea.precio)}</span>
        </p>
        <p className="text-sm" data-prueba="cantidad-linea">
          Cantidad: <span className="font-semibold">{linea.cantidad}</span>
        </p>
        {linea.avisos.map((aviso) => (
          <p
            key={aviso}
            className="mt-1 self-start border-l-4 border-tinta pl-2 text-sm font-semibold"
            data-prueba="aviso-linea"
          >
            {aviso}
          </p>
        ))}
      </div>
      <p className="shrink-0 text-right font-extrabold" data-prueba="total-linea">
        {linea.disponible ? (
          formatearCOP(linea.total)
        ) : (
          <span className="text-sm font-normal text-gris">No suma</span>
        )}
      </p>
    </li>
  );
}

/**
 * Resumen (escenarios 1 y 2): subtotal, mensaje del envío (D3), «Continuar con la compra» y
 * «Seguir comprando». En celular el botón queda fijo abajo de la pantalla.
 */
function ResumenCarrito({ carrito }: { carrito: CarritoVista }) {
  return (
    <section aria-labelledby="titulo-resumen" className="bg-superficie p-6">
      <h2 id="titulo-resumen" className="text-xl font-extrabold">
        Resumen
      </h2>
      <dl className="mt-4 flex items-baseline justify-between gap-4">
        <dt>Subtotal</dt>
        <dd className="text-2xl font-extrabold" data-prueba="subtotal">
          {formatearCOP(carrito.subtotal)}
        </dd>
      </dl>
      {carrito.subtotal > 0 && (
        <p className="mt-3 font-semibold" data-prueba="mensaje-envio">
          {carrito.faltaParaEnvioGratis > 0
            ? `Te faltan ${formatearCOP(carrito.faltaParaEnvioGratis)} para el envío gratis`
            : "¡Tu envío es gratis!"}
        </p>
      )}
      <p className="mt-1 text-sm text-gris">
        Precios con IVA incluido. El envío se confirma al ingresar tus datos.
      </p>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-blanco p-4 md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
        {/* El paso de datos de envío y pago (COM-01) llega en el Sprint 3. */}
        <button
          type="button"
          disabled={!carrito.puedeContinuar}
          className="min-h-12 w-full bg-tinta px-6 font-semibold text-blanco disabled:bg-linea disabled:text-gris"
        >
          Continuar con la compra
        </button>
        <p className="mt-2 text-center text-sm text-gris">Próximamente: datos de envío y pago.</p>
      </div>
      <Link
        href="/"
        className="mt-4 flex min-h-11 items-center justify-center underline underline-offset-4"
      >
        Seguir comprando
      </Link>
      {/* Espacio para que la barra fija del celular no tape el final de la página. */}
      <div aria-hidden="true" className="h-28 md:hidden" />
    </section>
  );
}

/** Escenario 3: carrito vacío. */
export function CarritoVacio() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Tu carrito</h1>
      <p className="mt-6 text-lg">Tu carrito está vacío</p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-12 items-center bg-tinta px-6 font-semibold text-blanco"
      >
        Explorar productos
      </Link>
    </>
  );
}

/** Lo que se ve mientras se carga el carrito del visitante. */
export function CarritoCargando() {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Tu carrito</h1>
      <p className="mt-6 text-gris" role="status">
        Cargando tu carrito…
      </p>
    </>
  );
}
