import { z } from "zod";
import { DEPARTAMENTOS } from "./divipola";

/**
 * Datos de contacto y envío del visitante (ZTV-19, COM-01). El mismo esquema valida en el
 * navegador (para avisar antes de enviar) y en el servidor (que es el que decide).
 */

export const MENSAJES = {
  nombreCompleto: "Ingresa tu nombre completo",
  correo: "Ingresa un correo válido, por ejemplo nombre@correo.com",
  celular: "Ingresa un celular colombiano de 10 dígitos que empiece por 3",
  departamento: "Selecciona tu departamento",
  ciudad: "Selecciona tu ciudad",
  direccion: "Ingresa la dirección de entrega",
  detalles: "Los detalles de la dirección pueden tener máximo 120 caracteres",
  notas: "Las notas para la entrega pueden tener máximo 200 caracteres",
  aceptoPolitica: "Debes autorizar el tratamiento de tus datos para continuar",
} as const;

export type CampoEntrega = keyof typeof MENSAJES;

const TEXTOS = new Set<string>(Object.values(MENSAJES));

/** Orden de los campos en pantalla: el foco va al primero con error (escenario 3). */
export const ORDEN_CAMPOS: CampoEntrega[] = [
  "nombreCompleto",
  "correo",
  "celular",
  "departamento",
  "ciudad",
  "direccion",
  "detalles",
  "notas",
  "aceptoPolitica",
];

/** Quita espacios, guiones, puntos y paréntesis que la gente suele escribir en un celular. */
export function normalizarCelular(valor: string): string {
  return valor.replace(/[\s\-.()]/g, "");
}

/** RN1: 10 dígitos que empiezan por 3. */
export function celularValido(valor: string): boolean {
  return /^3\d{9}$/.test(normalizarCelular(valor));
}

/** RN1: correo con usuario, @ y dominio con punto. */
export function correoValido(valor: string): boolean {
  return z.email().safeParse(valor.trim()).success;
}

/** Busca un municipio por su código DANE dentro del departamento elegido. */
export function buscarMunicipio(codigoDepartamento: string, codigoDane: string) {
  const departamento = DEPARTAMENTOS.find((d) => d.codigo === codigoDepartamento);
  const municipio = departamento?.municipios.find(([codigo]) => codigo === codigoDane);
  return departamento && municipio
    ? { departamento: departamento.nombre, ciudad: municipio[1], codigoDane: municipio[0] }
    : null;
}

const opcional = (maximo: number, mensaje: string) =>
  z
    .string()
    .trim()
    .max(maximo, mensaje)
    .optional()
    .transform((v) => (v ? v : null));

/** RN1 y RN2. Los valores llegan como texto del formulario. */
export const EsquemaDatosEntrega = z
  .object({
    nombreCompleto: z
      .string()
      .trim()
      .min(3, MENSAJES.nombreCompleto)
      .max(80, MENSAJES.nombreCompleto),
    correo: z.string().trim().toLowerCase().refine(correoValido, MENSAJES.correo),
    celular: z.string().refine(celularValido, MENSAJES.celular).transform(normalizarCelular),
    departamento: z.string().regex(/^\d{2}$/, MENSAJES.departamento),
    ciudad: z.string().regex(/^\d{5}$/, MENSAJES.ciudad),
    direccion: z.string().trim().min(5, MENSAJES.direccion).max(120, MENSAJES.direccion),
    detalles: opcional(120, MENSAJES.detalles),
    notas: opcional(200, MENSAJES.notas),
    aceptoPolitica: z.literal(true, { error: MENSAJES.aceptoPolitica }),
  })
  .superRefine((datos, ctx) => {
    // La ciudad debe ser un municipio del departamento elegido (lista oficial DANE).
    if (/^\d{5}$/.test(datos.ciudad) && !buscarMunicipio(datos.departamento, datos.ciudad)) {
      ctx.addIssue({ code: "custom", path: ["ciudad"], message: MENSAJES.ciudad });
    }
  });

export type EntradaDatosEntrega = z.input<typeof EsquemaDatosEntrega>;
export type DatosEntregaValidos = z.output<typeof EsquemaDatosEntrega>;
export type ErroresEntrega = Partial<Record<CampoEntrega, string>>;

/** Valida y devuelve los datos limpios, o un mensaje por campo (el primero de cada uno). */
export function validarDatosEntrega(
  entrada: unknown,
): { ok: true; datos: DatosEntregaValidos } | { ok: false; errores: ErroresEntrega } {
  const resultado = EsquemaDatosEntrega.safeParse(entrada);
  if (resultado.success) return { ok: true, datos: resultado.data };
  const errores: ErroresEntrega = {};
  for (const problema of resultado.error.issues) {
    const campo = problema.path[0] as CampoEntrega | undefined;
    if (campo && campo in MENSAJES && !errores[campo]) {
      // Un campo que falta o llega con otro tipo recibe su mensaje de siempre, no el genérico de zod.
      errores[campo] = TEXTOS.has(problema.message) ? problema.message : MENSAJES[campo];
    }
  }
  return { ok: false, errores };
}

/** El primer campo con error, en el orden de la pantalla. */
export function primerCampoConError(errores: ErroresEntrega): CampoEntrega | null {
  return ORDEN_CAMPOS.find((campo) => errores[campo]) ?? null;
}
