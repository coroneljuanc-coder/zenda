import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CompraProducto, CompraProductoConUrl } from "@/components/catalogo/CompraProducto";
import { Galeria } from "@/components/catalogo/Galeria";
import { listarSlugsProductos, obtenerProducto } from "@/lib/catalogo/listado";

type Props = PageProps<"/producto/[slug]">;

/**
 * Igual que la categoría: la página espera a conocer el producto antes de mostrarse. Un producto
 * inexistente o inactivo (escenario 4, RN3) muestra «No encontramos esta página»; en su primera
 * visita Next.js 16 ya envió el esqueleto con estado 200 y lo marca «noindex».
 */
export const instant = false;

/** Los productos activos se generan al compilar; Next exige al menos un resultado. */
export async function generateStaticParams() {
  const slugs = await listarSlugsProductos();
  return (slugs.length > 0 ? slugs : ["sin-productos"]).map((slug) => ({ slug }));
}

/** SEO (ZTV-13): título «Producto | Zenda» (ZTV-57), descripción y vista previa con la primera foto. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const producto = await obtenerProducto((await params).slug);
  if (!producto) return {};
  const foto = producto.imagenes[0];
  return {
    title: producto.nombre,
    description: producto.descripcion,
    openGraph: {
      title: `${producto.nombre} | Zenda`,
      description: producto.descripcion,
      type: "website",
      ...(foto ? { images: [{ url: foto.url, alt: foto.textoAlternativo }] } : {}),
    },
  };
}

/** Ficha de producto (ZTV-13): `/producto/lampara-escritorio-led`. */
export default async function PaginaProducto({ params }: Props) {
  const producto = await obtenerProducto((await params).slug);
  if (!producto) notFound();

  const {
    nombre,
    descripcion,
    textoPrecio,
    disponibilidad,
    agotado,
    categoria,
    imagenes,
    variantes,
  } = producto;
  const compra = { variantes, textoPrecio, disponibilidad, agotado };

  return (
    <>
      <nav aria-label="Ruta de navegación" className="text-sm text-gris">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/" className="underline underline-offset-4">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href={`/categoria/${categoria.slug}`} className="underline underline-offset-4">
              {categoria.nombre}
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-tinta">
            {nombre}
          </li>
        </ol>
      </nav>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <Galeria fotos={imagenes} agotado={agotado} />

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{nombre}</h1>
          {/* Precio, disponibilidad, talla y color (ZTV-15) y botón de compra. Mientras se lee
              la dirección (?variante=), se muestra sin nada elegido. */}
          <Suspense fallback={<CompraProducto {...compra} />}>
            <CompraProductoConUrl {...compra} />
          </Suspense>
          <p className="mt-8 max-w-prose">{descripcion}</p>
          <p className="mt-4 text-sm text-gris">
            Categoría:{" "}
            <Link href={`/categoria/${categoria.slug}`} className="underline underline-offset-4">
              {categoria.nombre}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
