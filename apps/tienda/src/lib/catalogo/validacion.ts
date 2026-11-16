import { z } from "zod";

/** RN4: minúsculas, sin tildes ni espacios, palabras separadas por guiones. Ejemplo: `camiseta-basica-algodon`. */
export const PATRON_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slug = z
  .string("slug es obligatorio")
  .regex(
    PATRON_SLUG,
    "slug debe ir en minúsculas, sin tildes y con guiones (ejemplo: camiseta-basica-algodon)",
  );

/** RN1: precios enteros en pesos colombianos, mayores que 0. */
const precio = z
  .number("precio debe ser un número")
  .int("precio debe ser un número entero de pesos (sin centavos)")
  .positive("precio debe ser mayor que 0");

const textoObligatorio = (campo: string) =>
  z.string(`${campo} es obligatorio`).trim().min(1, `${campo} es obligatorio`);

export const esquemaCategoria = z.object({
  nombre: textoObligatorio("nombre"),
  slug,
  descripcion: z.string().optional(),
  orden: z.number().int().nonnegative().default(0),
});

export const esquemaVariante = z.object({
  sku: textoObligatorio("sku"),
  talla: z.string().optional(),
  color: z.string().optional(),
  /** RN3: el stock nunca es negativo. */
  stock: z
    .number("stock debe ser un número")
    .int("stock debe ser un número entero")
    .nonnegative("stock no puede ser negativo"),
  /** Si se omite, la variante usa el precio del producto. */
  precio: precio.optional(),
});

export const esquemaImagen = z.object({
  url: z
    .string("url es obligatoria")
    .startsWith("/", "url debe empezar por / (archivo dentro de public/)"),
  textoAlternativo: textoObligatorio("textoAlternativo"),
});

export const esquemaProducto = z.object({
  nombre: textoObligatorio("nombre"),
  slug,
  descripcion: textoObligatorio("descripcion"),
  precio,
  /** RN2: slug de la categoría a la que pertenece. */
  categoria: z.string("categoria es obligatoria").min(1, "categoria es obligatoria"),
  activo: z.boolean().default(true),
  /** RN3: al menos una variante. */
  variantes: z
    .array(esquemaVariante)
    .min(1, "variantes: el producto necesita al menos una variante"),
  imagenes: z.array(esquemaImagen).min(1, "imagenes: el producto necesita al menos una foto"),
});

export const esquemaCatalogo = z.object({
  categorias: z.array(esquemaCategoria).min(1, "categorias: se necesita al menos una categoría"),
  productos: z.array(esquemaProducto),
});

/** Datos tal como se escriben (algunos campos tienen valor por defecto). */
export type DatosCatalogo = z.input<typeof esquemaCatalogo>;
/** Datos ya validados y completos. */
export type Catalogo = z.output<typeof esquemaCatalogo>;

/** Error de validación del catálogo: indica el producto (o la categoría) y el campo inválido. */
export class ErrorCatalogo extends Error {
  constructor(readonly problemas: string[]) {
    super(`El catálogo tiene datos inválidos y no se guardó nada:\n- ${problemas.join("\n- ")}`);
    this.name = "ErrorCatalogo";
  }
}

/** Convierte la ruta de un error de Zod en una frase que dice qué producto y qué campo fallaron. */
function describirUbicacion(datos: unknown, ruta: PropertyKey[]): string {
  const [coleccion, indice, ...resto] = ruta;
  const lista = (datos as Record<string, unknown> | null)?.[coleccion as string];
  const elemento = Array.isArray(lista) && typeof indice === "number" ? lista[indice] : undefined;
  const nombre =
    (elemento as { slug?: unknown } | undefined)?.slug ??
    (typeof indice === "number" ? `#${indice + 1}` : "");

  if (coleccion === "categorias") return `Categoría "${String(nombre)}"`;
  if (coleccion !== "productos") return String(coleccion ?? "catálogo");

  let ubicacion = `Producto "${String(nombre)}"`;
  const [subcoleccion, subindice] = resto;
  if (subcoleccion === "variantes" && typeof subindice === "number") {
    const variante = (elemento as { variantes?: { sku?: unknown }[] } | undefined)?.variantes?.[
      subindice
    ];
    ubicacion += `, variante "${String(variante?.sku ?? `#${subindice + 1}`)}"`;
  }
  if (subcoleccion === "imagenes" && typeof subindice === "number")
    ubicacion += `, foto #${subindice + 1}`;
  return ubicacion;
}

/**
 * Valida el catálogo completo antes de guardar cualquier dato (escenario 3 de ZTV-7).
 * Si algo es inválido lanza `ErrorCatalogo` con todos los problemas encontrados.
 */
export function validarCatalogo(datos: unknown): Catalogo {
  const resultado = esquemaCatalogo.safeParse(datos);
  if (!resultado.success) {
    throw new ErrorCatalogo(
      resultado.error.issues.map((i) => `${describirUbicacion(datos, i.path)}: ${i.message}`),
    );
  }

  const catalogo = resultado.data;
  const problemas: string[] = [];
  const repetidos = (valores: string[]) => [
    ...new Set(valores.filter((v, i) => valores.indexOf(v) !== i)),
  ];

  for (const s of repetidos(catalogo.categorias.map((c) => c.slug)))
    problemas.push(`Categoría "${s}": slug repetido (debe ser único)`);
  for (const s of repetidos(catalogo.productos.map((p) => p.slug)))
    problemas.push(`Producto "${s}": slug repetido (debe ser único)`);
  for (const s of repetidos(catalogo.productos.flatMap((p) => p.variantes.map((v) => v.sku))))
    problemas.push(`Variante "${s}": sku repetido (debe ser único)`);

  const categorias = new Set(catalogo.categorias.map((c) => c.slug));
  for (const p of catalogo.productos) {
    if (!categorias.has(p.categoria))
      problemas.push(`Producto "${p.slug}": categoria "${p.categoria}" no existe en el catálogo`);
  }

  if (problemas.length > 0) throw new ErrorCatalogo(problemas);
  return catalogo;
}
