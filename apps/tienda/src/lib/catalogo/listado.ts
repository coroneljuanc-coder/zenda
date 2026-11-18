import { cacheLife, cacheTag } from "next/cache";
import { obtenerBD } from "@/lib/bd";
import { consultarPaginaProductos, type PaginaProductos } from "./productos";

/**
 * Página del listado para la tienda, en caché unos minutos por número de página: los productos
 * cambian poco, pero el «Agotado» debe actualizarse pronto cuando empiecen las compras.
 * La etiqueta «productos» permite refrescarla a demanda cuando cambie el inventario.
 */
export async function listarPaginaProductos(pagina: number): Promise<PaginaProductos> {
  "use cache";
  cacheLife("minutes");
  cacheTag("productos");
  return consultarPaginaProductos(obtenerBD(), pagina);
}
