import type { PrismaClient } from "@/generated/prisma/client";
import { calcularEnvio, calcularSubtotal, faltaParaEnvioGratis, totalLinea } from "./precios";
import { MAXIMO_POR_LINEA } from "./reglas";

/**
 * Lo que muestra la página del carrito (ZTV-17, CAR-02). Recibe el cliente de base de datos para
 * poder probarla contra una base de prueba.
 */

export const AVISO_NO_DISPONIBLE = "Ya no está disponible";
export const AVISO_PRECIO_CAMBIO = "El precio de este producto cambió";
export const avisoCantidadAjustada = (n: number) =>
  `Ajustamos la cantidad a ${n === 1 ? "la única unidad disponible" : `las ${n} unidades disponibles`}`;

export type LineaVista = {
  id: string;
  varianteId: string;
  sku: string;
  producto: string;
  slug: string;
  /** «M / Negro», «500 ml»… o `null` si el producto no tiene talla ni color. */
  variante: string | null;
  imagen: { url: string; textoAlternativo: string } | null;
  /** RN1: precio unitario vigente del catálogo. */
  precio: number;
  cantidad: number;
  /** Lo máximo que se puede pedir de esta línea (para ZTV-18): el menor entre el stock y 10. */
  maximo: number;
  total: number;
  disponible: boolean;
  avisos: string[];
};

export type CarritoVista = {
  lineas: LineaVista[];
  /** Unidades de las líneas disponibles. */
  unidades: number;
  subtotal: number;
  envio: number;
  faltaParaEnvioGratis: number;
  /** Escenario 4: «Continuar con la compra» solo si queda al menos una línea disponible. */
  puedeContinuar: boolean;
};

const VACIO: CarritoVista = {
  lineas: [],
  unidades: 0,
  subtotal: 0,
  envio: 0,
  faltaParaEnvioGratis: 0,
  puedeContinuar: false,
};

/**
 * Arma el carrito del token con los datos vigentes del catálogo (RN6 de ZTV-16) y aplica el
 * escenario 4:
 * - Producto agotado o desactivado: «Ya no está disponible» y no suma (RN2).
 * - Precio distinto del que vio el visitante: «El precio de este producto cambió»; el subtotal usa
 *   el nuevo. El aviso se muestra una vez: queda guardado el precio nuevo como el ya visto.
 * - Cantidad mayor que el stock actual (o que 10): se ajusta en la base y se avisa (RN4).
 * Un carrito vencido o inexistente se muestra vacío (RN5 de ZTV-16).
 */
export async function consultarCarrito(
  bd: PrismaClient,
  token: string | null | undefined,
  ahora = new Date(),
): Promise<CarritoVista> {
  if (!token) return VACIO;
  const carrito = await bd.carrito.findUnique({
    where: { token },
    select: {
      expiraEn: true,
      lineas: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          cantidad: true,
          precioVisto: true,
          variante: {
            select: {
              id: true,
              sku: true,
              talla: true,
              color: true,
              stock: true,
              precio: true,
              producto: {
                select: {
                  nombre: true,
                  slug: true,
                  activo: true,
                  precio: true,
                  imagenes: {
                    select: { url: true, textoAlternativo: true },
                    orderBy: { orden: "asc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!carrito || carrito.expiraEn <= ahora) return VACIO;

  const lineas: LineaVista[] = [];
  const cambios: { id: string; cantidad: number; precioVisto: number }[] = [];

  for (const linea of carrito.lineas) {
    const { variante } = linea;
    const { producto } = variante;
    const precio = variante.precio ?? producto.precio;
    const disponible = producto.activo && variante.stock > 0;
    const maximo = Math.min(variante.stock, MAXIMO_POR_LINEA);
    const avisos: string[] = [];
    let cantidad = linea.cantidad;

    if (!disponible) {
      avisos.push(AVISO_NO_DISPONIBLE);
    } else {
      if (precio !== linea.precioVisto) avisos.push(AVISO_PRECIO_CAMBIO);
      if (cantidad > maximo) {
        cantidad = maximo;
        avisos.push(avisoCantidadAjustada(maximo));
      }
      if (cantidad !== linea.cantidad || precio !== linea.precioVisto) {
        cambios.push({ id: linea.id, cantidad, precioVisto: precio });
      }
    }

    lineas.push({
      id: linea.id,
      varianteId: variante.id,
      sku: variante.sku,
      producto: producto.nombre,
      slug: producto.slug,
      variante: [variante.talla, variante.color].filter(Boolean).join(" / ") || null,
      imagen: producto.imagenes[0] ?? null,
      precio,
      cantidad,
      maximo,
      total: disponible ? totalLinea({ precio, cantidad }) : 0,
      disponible,
      avisos,
    });
  }

  if (cambios.length > 0) {
    await bd.$transaction(
      cambios.map(({ id, cantidad, precioVisto }) =>
        bd.lineaCarrito.update({ where: { id }, data: { cantidad, precioVisto } }),
      ),
    );
  }

  const disponibles = lineas.filter((l) => l.disponible);
  const subtotal = calcularSubtotal(disponibles);
  return {
    lineas,
    unidades: disponibles.reduce((suma, l) => suma + l.cantidad, 0),
    subtotal,
    envio: calcularEnvio(subtotal),
    faltaParaEnvioGratis: faltaParaEnvioGratis(subtotal),
    puedeContinuar: disponibles.length > 0,
  };
}
