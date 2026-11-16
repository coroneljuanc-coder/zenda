import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Conexión única a la base de datos de la tienda (Neon en Vercel, `prisma dev` en local).
 * Se crea la primera vez que se usa, no al importar, para que compilar sin DATABASE_URL
 * no falle en páginas que no consultan la base. En desarrollo se reutiliza entre recargas.
 */
const global = globalThis as unknown as { prismaZenda?: PrismaClient };

export function obtenerBD(): PrismaClient {
  if (global.prismaZenda) return global.prismaZenda;

  const conexion = process.env.DATABASE_URL;
  if (!conexion) {
    throw new Error("DATABASE_URL no está configurada (ver apps/tienda/.env.example).");
  }
  const cliente = new PrismaClient({ adapter: new PrismaPg({ connectionString: conexion }) });
  global.prismaZenda = cliente;
  return cliente;
}
