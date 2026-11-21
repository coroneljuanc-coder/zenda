import { Suspense } from "react";
import { CuadriculaCargando, CuadriculaProductos } from "@/components/catalogo/CuadriculaProductos";
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
  const { pagina } = await searchParams;
  const datos = await listarPaginaProductos(interpretarPagina(pagina));
  return (
    <CuadriculaProductos
      datos={datos}
      ruta="/"
      // Escenario 4 de ZTV-11: no hay productos activos.
      vacio={<p className="text-gris">Pronto tendremos productos para ti. Vuelve más tarde.</p>}
    />
  );
}
