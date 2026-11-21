import type { PrismaClient } from "@/generated/prisma/client";
import {
  ajustarPagina,
  estaAgotado,
  PRODUCTOS_POR_PAGINA,
  stockTotal,
  textoDisponibilidad,
  textoPrecio,
} from "./reglas";

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
 * Con `categoriaId`, solo los productos de esa categoría (ZTV-12, mismas reglas: RN1 de CAT-03).
 * Recibe el cliente de base de datos para poder probarla contra una base de prueba.
 */
export async function consultarPaginaProductos(
  bd: PrismaClient,
  paginaPedida: number,
  {
    categoriaId,
    porPagina = PRODUCTOS_POR_PAGINA,
  }: { categoriaId?: string; porPagina?: number } = {},
): Promise<PaginaProductos> {
  const donde = { activo: true, ...(categoriaId ? { categoriaId } : {}) };
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

/** Lo que muestra la ficha de producto (ZTV-13). */
export type FichaProducto = {
  nombre: string;
  slug: string;
  descripcion: string;
  textoPrecio: string;
  unidades: number;
  disponibilidad: string;
  agotado: boolean;
  categoria: { nombre: string; slug: string };
  imagenes: { url: string; textoAlternativo: string }[];
};

/**
 * Ficha de un producto por su slug (ZTV-13). Devuelve `null` si no existe o está inactivo
 * (RN3: un producto inactivo no es accesible por URL → página 404).
 * RN1: todas las fotos, en el orden del campo `orden`. RN2: disponibilidad. RN4: precio.
 */
export async function consultarProducto(
  bd: PrismaClient,
  slug: string,
): Promise<FichaProducto | null> {
  const p = await bd.producto.findFirst({
    where: { slug, activo: true },
    select: {
      nombre: true,
      slug: true,
      descripcion: true,
      precio: true,
      categoria: { select: { nombre: true, slug: true } },
      variantes: { select: { stock: true, precio: true } },
      imagenes: { select: { url: true, textoAlternativo: true }, orderBy: { orden: "asc" } },
    },
  });
  if (!p) return null;

  const unidades = stockTotal(p.variantes);
  return {
    nombre: p.nombre,
    slug: p.slug,
    descripcion: p.descripcion,
    textoPrecio: textoPrecio(p.precio, p.variantes),
    unidades,
    disponibilidad: textoDisponibilidad(unidades),
    agotado: unidades <= 0,
    categoria: p.categoria,
    imagenes: p.imagenes,
  };
}

/** Slugs de los productos activos, para generar sus fichas al compilar. */
export async function consultarSlugsProductos(bd: PrismaClient): Promise<string[]> {
  const filas = await bd.producto.findMany({ where: { activo: true }, select: { slug: true } });
  return filas.map((f) => f.slug);
}
