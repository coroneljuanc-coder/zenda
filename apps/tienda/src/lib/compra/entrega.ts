import type { PrismaClient } from "@/generated/prisma/client";
import { buscarMunicipio, type DatosEntregaValidos } from "./datos-entrega";

/**
 * Guarda y lee los datos de envío del visitante junto a su carrito (ZTV-19, RN4): duran lo mismo
 * que el carrito (30 días) y se borran con él. Recibe el cliente de base de datos para poder
 * probarse contra una base de prueba.
 */

/** Lo que el formulario necesita para mostrarse diligenciado (escenario 2). */
export type DatosEntregaGuardados = {
  nombreCompleto: string;
  correo: string;
  celular: string;
  /** Código DANE del departamento (dos dígitos). */
  departamento: string;
  departamentoNombre: string;
  /** Código DANE del municipio (cinco dígitos). */
  ciudad: string;
  ciudadNombre: string;
  direccion: string;
  detalles: string | null;
  notas: string | null;
};

async function carritoVigente(bd: PrismaClient, token: string | null | undefined, ahora: Date) {
  if (!token) return null;
  const carrito = await bd.carrito.findUnique({
    where: { token },
    select: { id: true, expiraEn: true },
  });
  return carrito && carrito.expiraEn > ahora ? carrito : null;
}

export type ResultadoGuardar = { ok: true } | { ok: false; motivo: "sin-carrito" };

/** Guarda (o reemplaza) los datos del carrito del token. RN2: registra cuándo aceptó la política. */
export async function guardarDatosEntrega(
  bd: PrismaClient,
  {
    token,
    datos,
    ahora = new Date(),
  }: { token: string | null | undefined; datos: DatosEntregaValidos; ahora?: Date },
): Promise<ResultadoGuardar> {
  const carrito = await carritoVigente(bd, token, ahora);
  if (!carrito) return { ok: false, motivo: "sin-carrito" };
  const lugar = buscarMunicipio(datos.departamento, datos.ciudad);
  // El esquema ya lo comprobó; si aun así no existe, no se guarda nada inválido.
  if (!lugar) throw new Error("Municipio fuera de la lista DANE");

  const valores = {
    nombreCompleto: datos.nombreCompleto,
    correo: datos.correo,
    celular: datos.celular,
    departamento: lugar.departamento,
    ciudad: lugar.ciudad,
    codigoDane: lugar.codigoDane,
    direccion: datos.direccion,
    detalles: datos.detalles,
    notas: datos.notas,
    aceptoPoliticaEn: ahora,
  };
  await bd.datosEntrega.upsert({
    where: { carritoId: carrito.id },
    create: { carritoId: carrito.id, ...valores },
    update: valores,
  });
  return { ok: true };
}

/** Los datos guardados del carrito del token, o `null` si no hay. */
export async function leerDatosEntrega(
  bd: PrismaClient,
  token: string | null | undefined,
  ahora = new Date(),
): Promise<DatosEntregaGuardados | null> {
  const carrito = await carritoVigente(bd, token, ahora);
  if (!carrito) return null;
  const datos = await bd.datosEntrega.findUnique({ where: { carritoId: carrito.id } });
  if (!datos) return null;
  return {
    nombreCompleto: datos.nombreCompleto,
    correo: datos.correo,
    celular: datos.celular,
    departamento: datos.codigoDane.slice(0, 2),
    departamentoNombre: datos.departamento,
    ciudad: datos.codigoDane,
    ciudadNombre: datos.ciudad,
    direccion: datos.direccion,
    detalles: datos.detalles,
    notas: datos.notas,
  };
}
