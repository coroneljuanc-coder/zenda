import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { validarCantidad, vencimientoDesde } from "./reglas";

/**
 * Operaciones del carrito en la base de datos (ZTV-16). Reciben el cliente de base de datos para
 * poder probarlas contra una base de prueba. No saben de cookies: eso lo hace la acción del
 * servidor (src/app/acciones/carrito.ts).
 */

/** Identificador aleatorio de 256 bits para la cookie: imposible de adivinar. */
export function nuevoToken(): string {
  return randomBytes(32).toString("base64url");
}

/** El carrito vigente de un token, o `null` si no existe o ya venció (RN5). */
async function carritoVigente(bd: PrismaClient, token: string | null | undefined, ahora: Date) {
  if (!token) return null;
  const carrito = await bd.carrito.findUnique({ where: { token } });
  return carrito && carrito.expiraEn > ahora ? carrito : null;
}

export type ResultadoAgregar =
  | { ok: true; token: string; producto: string; cantidad: number; unidadesEnCarrito: number }
  | { ok: false; mensaje: string; unidadesEnCarrito: number };

/**
 * Agrega `cantidad` unidades de una variante al carrito del `token` (escenarios 1 a 3).
 * - RN4: rechaza variantes de productos agotados o inactivos, aunque la petición no venga del botón.
 * - RN1: la línea nunca pasa del stock ni de 10 unidades; si pasaría, no cambia nada.
 * - RN2: una sola línea por variante; si ya estaba, suma la cantidad.
 * - RN3: no toca el stock. RN5: cada cambio extiende la vigencia 30 días.
 * Si no hay carrito vigente, crea uno con un token nuevo (que la acción guarda en la cookie).
 */
export async function agregarAlCarrito(
  bd: PrismaClient,
  { token, varianteId, cantidad }: { token?: string | null; varianteId: string; cantidad: number },
  ahora = new Date(),
): Promise<ResultadoAgregar> {
  return bd.$transaction(async (tx) => {
    const actual = await carritoVigente(tx as PrismaClient, token, ahora);
    const unidadesActuales = actual ? await contarUnidadesDe(tx as PrismaClient, actual.id) : 0;

    const variante = await tx.varianteProducto.findUnique({
      where: { id: varianteId },
      select: {
        id: true,
        stock: true,
        precio: true,
        producto: { select: { nombre: true, activo: true, precio: true } },
      },
    });
    if (!variante || !variante.producto.activo || variante.stock <= 0) {
      return {
        ok: false,
        mensaje: "Este producto no está disponible por ahora.",
        unidadesEnCarrito: unidadesActuales,
      };
    }

    const linea = actual
      ? await tx.lineaCarrito.findUnique({
          where: { carritoId_varianteId: { carritoId: actual.id, varianteId } },
        })
      : null;
    const validacion = validarCantidad({
      enCarrito: linea?.cantidad ?? 0,
      agregar: cantidad,
      stock: variante.stock,
    });
    if (!validacion.ok) {
      return { ok: false, mensaje: validacion.mensaje, unidadesEnCarrito: unidadesActuales };
    }

    const carrito =
      actual ??
      (await tx.carrito.create({
        data: { token: nuevoToken(), expiraEn: vencimientoDesde(ahora) },
      }));
    // El precio que el visitante está viendo ahora: el propio de la variante o el del producto.
    // Solo sirve para avisar si cambia (ZTV-17); RN6: el subtotal usa siempre el vigente.
    const precioVisto = variante.precio ?? variante.producto.precio;
    await tx.lineaCarrito.upsert({
      where: { carritoId_varianteId: { carritoId: carrito.id, varianteId } },
      create: { carritoId: carrito.id, varianteId, cantidad: validacion.total, precioVisto },
      update: { cantidad: validacion.total, precioVisto },
    });
    await tx.carrito.update({
      where: { id: carrito.id },
      data: { expiraEn: vencimientoDesde(ahora) },
    });

    return {
      ok: true,
      token: carrito.token,
      producto: variante.producto.nombre,
      cantidad,
      unidadesEnCarrito: await contarUnidadesDe(tx as PrismaClient, carrito.id),
    };
  });
}

async function contarUnidadesDe(bd: PrismaClient, carritoId: string): Promise<number> {
  const { _sum } = await bd.lineaCarrito.aggregate({
    where: { carritoId },
    _sum: { cantidad: true },
  });
  return _sum.cantidad ?? 0;
}

/** Unidades totales del carrito del token, para el contador del encabezado. 0 si no hay carrito vigente. */
export async function contarUnidades(
  bd: PrismaClient,
  token: string | null | undefined,
  ahora = new Date(),
): Promise<number> {
  const carrito = await carritoVigente(bd, token, ahora);
  return carrito ? contarUnidadesDe(bd, carrito.id) : 0;
}
