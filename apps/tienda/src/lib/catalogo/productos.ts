import type { PrismaClient } from "@/generated/prisma/client";
import { ajustarPagina, estaAgotado, PRODUCTOS_POR_PAGINA, textoPrecio } from "./reglas";

/** Lo que necesita una tarjeta del listado (ZTV-11). */
export type TarjetaProducto = {
  nombre: string;
  slug: string;
  textoPrecio: string;
  agotado: boolean;
  imagen: { url: string; textoAlternativo: string } | null;
};

export type PaginaProductos = {
  productos: TarjetaProducto[];
  pagina: number;
  totalPaginas: number;
  total: number;
};

/**
 * Una página del listado de productos (ZTV-11):
 * - RN1: solo productos activos.
 * - Escenario 1: del más reciente al más antiguo; si dos productos tienen la misma fecha, por
 *   nombre, para que el orden sea siempre el mismo.
 * - RN5: 12 por página; una página que no existe muestra la última válida.
 * Recibe el cliente de base de datos para poder probarla contra una base de prueba.
 */
export async function consultarPaginaProductos(
  bd: PrismaClient,
  paginaPedida: number,
  porPagina = PRODUCTOS_POR_PAGINA,
): Promise<PaginaProductos> {
  const donde = { activo: true };
  const total = await bd.producto.count({ where: donde });
  const { pagina, totalPaginas } = ajustarPagina(paginaPedida, total, porPagina);

  const filas = await bd.producto.findMany({
    where: donde,
    orderBy: [{ creadoEn: "desc" }, { nombre: "asc" }],
    skip: (pagina - 1) * porPagina,
    take: porPagina,
    select: {
      nombre: true,
      slug: true,
      precio: true,
      variantes: { select: { stock: true, precio: true } },
      imagenes: {
        select: { url: true, textoAlternativo: true },
        orderBy: { orden: "asc" },
        take: 1,
      },
    },
  });

  const productos = filas.map((p) => ({
    nombre: p.nombre,
    slug: p.slug,
    textoPrecio: textoPrecio(p.precio, p.variantes),
    agotado: estaAgotado(p.variantes),
    imagen: p.imagenes[0] ?? null,
  }));

  return { productos, pagina, totalPaginas, total };
}
