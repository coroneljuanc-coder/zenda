import Image from "next/image";
import Link from "next/link";
import type { TarjetaProducto as Datos } from "@/lib/catalogo/productos";

/**
 * Tarjeta del listado (ZTV-11, ZTV-41): foto cuadrada, nombre de máximo 2 líneas y precio en
 * negrita. Toda la tarjeta es un enlace a la ficha del producto (llega con ZTV-13).
 * Agotado (escenario 3, ZTV-43): etiqueta «Agotado» y foto atenuada.
 */
export function TarjetaProducto({
  producto,
  prioritaria,
}: {
  producto: Datos;
  prioritaria: boolean;
}) {
  const { nombre, slug, textoPrecio, agotado, imagen } = producto;
  return (
    <li>
      <Link href={`/producto/${slug}`} className="group block" data-prueba="tarjeta-producto">
        <div className="relative aspect-square bg-superficie">
          {imagen && (
            <Image
              src={imagen.url}
              alt={imagen.textoAlternativo}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              loading={prioritaria ? "eager" : "lazy"}
              // Las fotos de ejemplo son SVG (vectores): no se optimizan. Las fotos reales sí.
              unoptimized={imagen.url.endsWith(".svg")}
              className={`object-cover ${agotado ? "opacity-50" : ""}`}
            />
          )}
          {agotado && (
            <span className="absolute top-2 left-2 bg-tinta px-2 py-1 text-xs text-blanco">
              Agotado
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm group-hover:underline">{nombre}</p>
        <p className="mt-1 font-extrabold">{textoPrecio}</p>
      </Link>
    </li>
  );
}
