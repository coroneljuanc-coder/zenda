import { cacheLife, cacheTag } from "next/cache";
import { obtenerBD } from "@/lib/bd";
import { consultarCategoriasMenu, type CategoriaMenu } from "./categorias";

/**
 * Categorías para el menú de la tienda. Cambian muy poco, así que se guardan en caché una hora:
 * la página no consulta la base en cada visita. Se generan al compilar en Vercel y en CI,
 * donde la base ya tiene las migraciones y los datos de ejemplo.
 */
export async function listarCategoriasMenu(): Promise<CategoriaMenu[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categorias");
  return consultarCategoriasMenu(obtenerBD());
}
