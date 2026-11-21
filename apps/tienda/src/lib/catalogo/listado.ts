import { cacheLife, cacheTag } from "next/cache";
import { obtenerBD } from "@/lib/bd";
import { consultarCategoria, consultarCategoriasMenu, type CategoriaDetalle } from "./categorias";
import {
  consultarPaginaProductos,
  consultarProducto,
  consultarSlugsProductos,
  type FichaProducto,
  type PaginaProductos,
} from "./productos";

/**
 * Página del listado para la tienda, en caché unos minutos por número de página y categoría:
 * los productos cambian poco, pero el «Agotado» debe actualizarse pronto cuando empiecen las
 * compras. La etiqueta «productos» permite refrescarla a demanda cuando cambie el inventario.
 */
export async function listarPaginaProductos(
  pagina: number,
  categoriaId?: string,
): Promise<PaginaProductos> {
  "use cache";
  cacheLife("minutes");
  cacheTag("productos");
  return consultarPaginaProductos(obtenerBD(), pagina, { categoriaId });
}

/** Categoría por su slug (ZTV-12), en caché una hora como el menú. */
export async function obtenerCategoria(slug: string): Promise<CategoriaDetalle | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("categorias");
  return consultarCategoria(obtenerBD(), slug);
}

/** Slugs de todas las categorías, para generar sus páginas al compilar. */
export async function listarSlugsCategorias(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categorias");
  return (await consultarCategoriasMenu(obtenerBD())).map((c) => c.slug);
}

/** Ficha de un producto activo por su slug (ZTV-13), en caché unos minutos como el listado. */
export async function obtenerProducto(slug: string): Promise<FichaProducto | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("productos");
  return consultarProducto(obtenerBD(), slug);
}

/** Slugs de los productos activos, para generar sus fichas al compilar. */
export async function listarSlugsProductos(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("productos");
  return consultarSlugsProductos(obtenerBD());
}
