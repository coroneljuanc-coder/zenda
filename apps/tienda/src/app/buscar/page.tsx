import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { CuadriculaCargando, CuadriculaProductos } from "@/components/catalogo/CuadriculaProductos";
import { obtenerBD } from "@/lib/bd";
import { buscarProductos, textoResultados, validarBusqueda } from "@/lib/catalogo/busqueda";
import { listarCategoriasMenu } from "@/lib/catalogo/menu";
import { interpretarPagina } from "@/lib/catalogo/reglas";

// Los resultados cambian con cada búsqueda: no se indexan en buscadores.
export const metadata: Metadata = {
  title: "Buscar productos",
  robots: { index: false, follow: true },
};

/** Resultados de la búsqueda (ZTV-14): `/buscar?q=camiseta`. */
export default function PaginaBuscar({ searchParams }: PageProps<"/buscar">) {
  return (
    <Suspense fallback={<CuadriculaCargando />}>
      <Resultados searchParams={searchParams} />
    </Suspense>
  );
}

async function Resultados({ searchParams }: Pick<PageProps<"/buscar">, "searchParams">) {
  await connection();
  const { q, pagina } = await searchParams;
  const busqueda = validarBusqueda(q);

  if (!busqueda.ok) {
    return (
      <>
        <h1 className="text-3xl font-extrabold tracking-tight">Buscar productos</h1>
        <p className="mt-4" role="status">
          {busqueda.mensaje}
        </p>
      </>
    );
  }

  const datos = await buscarProductos(obtenerBD(), busqueda.texto, interpretarPagina(pagina));
  const mensaje = textoResultados(datos.total, busqueda.texto);
  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Buscar productos</h1>
      {/* Accesibilidad: el número de resultados se anuncia a los lectores de pantalla. */}
      <p className="mt-2" role="status" data-prueba="resultados-busqueda">
        {mensaje}
      </p>
      <CuadriculaProductos
        datos={datos}
        ruta={`/buscar?q=${encodeURIComponent(busqueda.texto)}`}
        vacio={<CategoriasSugeridas />}
      />
    </>
  );
}

/** Escenario 3: sin resultados, se ofrecen las categorías. */
async function CategoriasSugeridas() {
  const categorias = await listarCategoriasMenu();
  return (
    <ul className="flex flex-wrap gap-4">
      {categorias.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/categoria/${c.slug}`}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
          >
            {c.nombre}
          </Link>
        </li>
      ))}
    </ul>
  );
}
