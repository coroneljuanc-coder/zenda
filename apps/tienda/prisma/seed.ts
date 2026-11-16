// Carga de datos de ejemplo (ZTV-7). Se ejecuta con `npm run db:seed`.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DATOS_EJEMPLO } from "../src/lib/catalogo/datos-ejemplo";
import { sembrarCatalogo } from "../src/lib/catalogo/sembrar";
import { ErrorCatalogo } from "../src/lib/catalogo/validacion";

const conexion = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!conexion) {
  console.error(
    "Falta la variable DATABASE_URL. En local va en apps/tienda/.env.local (ver .env.example).",
  );
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: conexion }) });

async function main() {
  try {
    const resumen = await sembrarCatalogo(prisma, DATOS_EJEMPLO);
    console.log(
      `Catálogo de ejemplo cargado: ${resumen.categorias} categorías, ${resumen.productos} productos, ` +
        `${resumen.variantes} variantes y ${resumen.imagenes} fotos.`,
    );
  } catch (error) {
    console.error(error instanceof ErrorCatalogo ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
