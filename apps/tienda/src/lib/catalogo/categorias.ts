import type { PrismaClient } from "@/generated/prisma/client";

export type CategoriaMenu = { nombre: string; slug: string };

/**
 * Categorías del menú en el orden del campo `orden` (RN1 de ZTV-10); a igual orden, por nombre.
 * Recibe el cliente de base de datos para poder probarla contra una base de prueba.
 */
export function consultarCategoriasMenu(bd: PrismaClient): Promise<CategoriaMenu[]> {
  return bd.categoria.findMany({
    select: { nombre: true, slug: true },
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });
}

export type CategoriaDetalle = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
};

/** Una categoría por su `slug` (RN3 de ZTV-12), o `null` si no existe (escenario 3: 404). */
export function consultarCategoria(
  bd: PrismaClient,
  slug: string,
): Promise<CategoriaDetalle | null> {
  return bd.categoria.findUnique({
    where: { slug },
    select: { id: true, nombre: true, slug: true, descripcion: true },
  });
}
