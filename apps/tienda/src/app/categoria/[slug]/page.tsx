import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CuadriculaCargando, CuadriculaProductos } from "@/components/catalogo/CuadriculaProductos";
import {
  listarPaginaProductos,
  listarSlugsCategorias,
  obtenerCategoria,
} from "@/lib/catalogo/listado";
import { interpretarPagina } from "@/lib/catalogo/reglas";

type Props = PageProps<"/categoria/[slug]">;

/**
 * Esta página espera a saber qué categoría es antes de mostrar el título, la ruta y la
 * descripción, en vez de mostrar un esqueleto genérico. Las categorías existentes se generan al
 * compilar, así que la espera es mínima.
 * Una categoría inexistente (escenario 3) muestra «No encontramos esta página». En su primera
 * visita, Next.js 16 ya envió el esqueleto con estado 200 y lo marca «noindex»; desde la segunda
 * visita responde 404.
 */
export const instant = false;

/**
 * Las categorías existentes se generan al compilar; una nueva se genera en su primera visita.
 * Next exige al menos un resultado: si la base aún no tiene categorías, se genera una dirección
 * que no existe, que simplemente responde con la página 404.
 */
export async function generateStaticParams() {
  const slugs = await listarSlugsCategorias();
  return (slugs.length > 0 ? slugs : ["sin-categorias"]).map((slug) => ({ slug }));
}

/** SEO (ZTV-12): título «Hogar · Zenda» y la descripción de la categoría. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const categoria = await obtenerCategoria((await params).slug);
  if (!categoria) return {};
  return { title: categoria.nombre, description: categoria.descripcion ?? undefined };
}

/** Productos de una categoría (ZTV-12): `/categoria/hogar`. */
export default async function PaginaCategoria({ params, searchParams }: Props) {
  const categoria = await obtenerCategoria((await params).slug);
  // Escenario 3: categoría inexistente → «No encontramos esta página» (404).
  if (!categoria) notFound();

  const ruta = `/categoria/${categoria.slug}`;
  return (
    <>
      <nav aria-label="Ruta de navegación" className="text-sm text-gris">
        <ol className="flex gap-2">
          <li>
            <Link href="/" className="underline underline-offset-4">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-tinta">
            {categoria.nombre}
          </li>
        </ol>
      </nav>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{categoria.nombre}</h1>
      {categoria.descripcion && <p className="mt-2 text-gris">{categoria.descripcion}</p>}

      <Suspense fallback={<CuadriculaCargando />}>
        <Listado categoriaId={categoria.id} ruta={ruta} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Listado({
  categoriaId,
  ruta,
  searchParams,
}: {
  categoriaId: string;
  ruta: string;
  searchParams: Props["searchParams"];
}) {
  const { pagina } = await searchParams;
  const datos = await listarPaginaProductos(interpretarPagina(pagina), categoriaId);
  return (
    <CuadriculaProductos
      datos={datos}
      ruta={ruta}
      // Escenario 2: categoría sin productos activos.
      vacio={
        <>
          <p className="text-gris">Aún no hay productos en esta categoría.</p>
          <Link
            href="/"
            className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4"
          >
            Ver todos los productos
          </Link>
        </>
      }
    />
  );
}
