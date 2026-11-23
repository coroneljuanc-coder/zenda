import type { PrismaClient } from "@/generated/prisma/client";
import type { PaginaProductos } from "./productos";
import { PRODUCTOS_POR_PAGINA, ajustarPagina, estaAgotado, textoPrecio } from "./reglas";

/**
 * Búsqueda de productos por nombre (ZTV-14).
 * - RN1: en el nombre y la descripción de los productos activos.
 * - RN2: sin importar mayúsculas ni tildes (la «ñ» cuenta como «n»).
 * - RN3: de 2 a 60 caracteres, sin los espacios del inicio y del final.
 * - RN4: primero los que coinciden en el nombre; luego, los que coinciden solo en la descripción.
 * - RN5: mismas reglas de precio, agotado y paginación del listado (ZTV-11).
 * Seguridad: el texto va como parámetro de la consulta (nunca como SQL) y los comodines de LIKE
 * se escapan, así que «%» o «_» se buscan como texto.
 */

export const MINIMO_BUSQUEDA = 2;
export const MAXIMO_BUSQUEDA = 60;
export const MENSAJE_BUSQUEDA_CORTA = "Escribe al menos 2 caracteres";

export type BusquedaValidada = { ok: true; texto: string } | { ok: false; mensaje: string };

/** RN3: valida el texto que escribió el visitante. */
export function validarBusqueda(q: unknown): BusquedaValidada {
  const texto = typeof q === "string" ? q.trim() : "";
  if (texto.length < MINIMO_BUSQUEDA) return { ok: false, mensaje: MENSAJE_BUSQUEDA_CORTA };
  if (texto.length > MAXIMO_BUSQUEDA) {
    return { ok: false, mensaje: `Escribe máximo ${MAXIMO_BUSQUEDA} caracteres` };
  }
  return { ok: true, texto };
}

/** RN2: minúsculas y sin tildes («Lámpara» → «lampara», «Año» → «ano»). */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** «N resultados para «texto»» (Diseño / Interfaz). */
export function textoResultados(total: number, texto: string): string {
  if (total === 0) {
    return `No encontramos productos para «${texto}». Revisa la ortografía o explora nuestras categorías.`;
  }
  return `${total} ${total === 1 ? "resultado" : "resultados"} para «${texto}»`;
}

// Mismo cambio que `normalizar`, hecho en PostgreSQL con translate (sin extensiones).
const CON_TILDE = "áàäâãéèëêíìïîóòöôõúùüûñç";
const SIN_TILDE = "aaaaaeeeeiiiiooooouuuunc";

export async function buscarProductos(
  bd: PrismaClient,
  texto: string,
  paginaPedida: number,
  porPagina = PRODUCTOS_POR_PAGINA,
): Promise<PaginaProductos> {
  const patron = `%${normalizar(texto).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const coincidencias = await bd.$queryRaw<{ id: string; enNombre: boolean }[]>`
    SELECT id, translate(lower(nombre), ${CON_TILDE}, ${SIN_TILDE}) LIKE ${patron} ESCAPE '\\' AS "enNombre"
    FROM "Producto"
    WHERE activo
      AND (translate(lower(nombre), ${CON_TILDE}, ${SIN_TILDE}) LIKE ${patron} ESCAPE '\\'
        OR translate(lower(descripcion), ${CON_TILDE}, ${SIN_TILDE}) LIKE ${patron} ESCAPE '\\')
    ORDER BY "enNombre" DESC, "creadoEn" DESC, nombre ASC`;

  const total = coincidencias.length;
  const { pagina, totalPaginas } = ajustarPagina(paginaPedida, total, porPagina);
  const ids = coincidencias.slice((pagina - 1) * porPagina, pagina * porPagina).map((c) => c.id);

  const filas = await bd.producto.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
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
  const porId = new Map(filas.map((p) => [p.id, p]));
  const productos = ids
    .map((id) => porId.get(id))
    .filter((p) => p !== undefined)
    .map((p) => ({
      nombre: p.nombre,
      slug: p.slug,
      textoPrecio: textoPrecio(p.precio, p.variantes),
      agotado: estaAgotado(p.variantes),
      imagen: p.imagenes[0] ?? null,
    }));
  return { productos, pagina, totalPaginas, total };
}
