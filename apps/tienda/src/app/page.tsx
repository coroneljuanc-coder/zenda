import { Suspense } from "react";
import { Paginacion } from "@/components/catalogo/Paginacion";
import { TarjetaProducto } from "@/components/catalogo/TarjetaProducto";
import { listarPaginaProductos } from "@/lib/catalogo/listado";
import { interpretarPagina } from "@/lib/catalogo/reglas";

/** Página de inicio: listado de productos (ZTV-11). */
export default function Inicio({ searchParams }: PageProps<"/">) {
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Productos</h1>
      {/* La página depende de `?pagina=`, así que el listado se carga aparte del resto. */}
      <Suspense fallback={<CuadriculaCargando />}>
        <Listado searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Listado({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { pagina: paginaPedida } = await searchParams;
  const { productos, pagina, totalPaginas } = await listarPaginaProductos(
    interpretarPagina(paginaPedida),
  );

  // Escenario 4 (ZTV-43): no hay productos activos.
  if (productos.length === 0) {
    return <p className="mt-6 text-gris">Pronto tendremos productos para ti. Vuelve más tarde.</p>;
  }

  return (
    <>
      <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
        {productos.map((producto, indice) => (
          <TarjetaProducto key={producto.slug} producto={producto} prioritaria={indice < 4} />
        ))}
      </ul>
      <Paginacion pagina={pagina} totalPaginas={totalPaginas} />
    </>
  );
}

function CuadriculaCargando() {
  return (
    <div
      className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
    >
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <div className="aspect-square bg-superficie" />
          <div className="mt-2 h-4 w-3/4 bg-superficie" />
          <div className="mt-2 h-4 w-1/3 bg-superficie" />
        </div>
      ))}
      <p className="sr-only">Cargando productos…</p>
    </div>
  );
}
