import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

/**
 * Conexión única a la base de datos del servicio de Notificaciones (ZTV-91): Neon en Vercel y la
 * base local de `npm run bd:iniciar` (zenda_notificaciones) en el computador de desarrollo.
 * Se crea la primera vez que se usa, no al importar, para poder compilar sin DATABASE_URL.
 */
const global = globalThis as unknown as { prismaNotificaciones?: PrismaClient };

export function obtenerBD(): PrismaClient {
  if (global.prismaNotificaciones) return global.prismaNotificaciones;
  const conexion = process.env.DATABASE_URL;
  if (!conexion) {
    throw new Error("DATABASE_URL no está configurada (ver .env.example, sección Notificaciones).");
  }
  // Pocas conexiones por proceso: el plan gratuito de Neon limita cuántas puede haber abiertas.
  const cliente = new PrismaClient({
    adapter: new PrismaPg({ connectionString: conexion, max: 3 }),
  });
  global.prismaNotificaciones = cliente;
  return cliente;
}

/** ¿Responde la base de datos? Para el chequeo de salud; nunca lanza ni expone detalles. */
export async function baseDisponible(bd: Pick<PrismaClient, "$queryRaw">): Promise<boolean> {
  try {
    await bd.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
