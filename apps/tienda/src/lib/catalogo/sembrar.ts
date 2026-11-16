import type { PrismaClient } from "../../generated/prisma/client";
import { validarCatalogo } from "./validacion";

export type ResumenCarga = {
  categorias: number;
  productos: number;
  variantes: number;
  imagenes: number;
};

/**
 * Carga (o actualiza) el catálogo en la base de datos (ZTV-7, D6).
 * - Primero valida todo: si hay un dato inválido, no se toca la base de datos (escenario 3).
 * - Todo se guarda en una sola transacción: o queda todo, o no queda nada.
 * - Usa `upsert` por slug, sku y orden de la foto, así que se puede ejecutar varias veces sin duplicar (escenario 2).
 * - Al actualizar una variante que ya existe no se toca su stock: el inventario real manda sobre los datos de ejemplo.
 */
export async function sembrarCatalogo(prisma: PrismaClient, datos: unknown): Promise<ResumenCarga> {
  const catalogo = validarCatalogo(datos);

  return prisma.$transaction(
    async (tx) => {
      const idCategoria = new Map<string, string>();
      for (const c of catalogo.categorias) {
        const campos = { nombre: c.nombre, descripcion: c.descripcion ?? null, orden: c.orden };
        const categoria = await tx.categoria.upsert({
          where: { slug: c.slug },
          create: { slug: c.slug, ...campos },
          update: campos,
        });
        idCategoria.set(c.slug, categoria.id);
      }

      let variantes = 0;
      let imagenes = 0;
      for (const p of catalogo.productos) {
        const campos = {
          nombre: p.nombre,
          descripcion: p.descripcion,
          precio: p.precio,
          activo: p.activo,
          categoriaId: idCategoria.get(p.categoria)!,
        };
        const producto = await tx.producto.upsert({
          where: { slug: p.slug },
          create: { slug: p.slug, ...campos },
          update: campos,
        });

        for (const v of p.variantes) {
          const campos = {
            talla: v.talla ?? null,
            color: v.color ?? null,
            precio: v.precio ?? null,
          };
          await tx.varianteProducto.upsert({
            where: { sku: v.sku },
            create: { sku: v.sku, stock: v.stock, productoId: producto.id, ...campos },
            update: { productoId: producto.id, ...campos },
          });
          variantes++;
        }

        for (const [i, img] of p.imagenes.entries()) {
          const orden = i + 1;
          await tx.imagenProducto.upsert({
            where: { productoId_orden: { productoId: producto.id, orden } },
            create: {
              productoId: producto.id,
              orden,
              url: img.url,
              textoAlternativo: img.textoAlternativo,
            },
            update: { url: img.url, textoAlternativo: img.textoAlternativo },
          });
          imagenes++;
        }
      }

      return {
        categorias: catalogo.categorias.length,
        productos: catalogo.productos.length,
        variantes,
        imagenes,
      };
    },
    { timeout: 60_000 },
  );
}
