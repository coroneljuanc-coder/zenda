// Pruebas de integración de la carga de datos (ZTV-7): usan una base de datos PostgreSQL real.
// - En GitHub Actions: un PostgreSQL temporal que se crea y se destruye en cada ejecución.
// - En local: la base de `prisma dev` configurada en apps/tienda/.env.local.
// Por seguridad, BORRAN los datos antes de cada prueba y solo corren contra una base en este computador (localhost).
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client";
import { DATOS_EJEMPLO } from "./datos-ejemplo";
import { sembrarCatalogo } from "./sembrar";
import { ErrorCatalogo } from "./validacion";

const envLocal = join(import.meta.dirname, "../../../.env.local");
if (!process.env.DATABASE_URL && existsSync(envLocal)) process.loadEnvFile(envLocal);

const conexion = process.env.DATABASE_URL;
if (!conexion)
  throw new Error(
    "Las pruebas de integración necesitan DATABASE_URL (ver apps/tienda/.env.example).",
  );
const servidor = new URL(conexion).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(servidor)) {
  throw new Error(
    `Las pruebas de integración borran datos: solo corren contra localhost y DATABASE_URL apunta a ${servidor}.`,
  );
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: conexion }) });

async function contar() {
  const [categorias, productos, variantes, imagenes] = await Promise.all([
    prisma.categoria.count(),
    prisma.producto.count(),
    prisma.varianteProducto.count(),
    prisma.imagenProducto.count(),
  ]);
  return { categorias, productos, variantes, imagenes };
}

describe("carga de datos de ejemplo en PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE "ImagenProducto", "VarianteProducto", "Producto", "Categoria" RESTART IDENTITY CASCADE`,
    );
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("deja al menos 4 categorías y 20 productos activos, cada uno con variante y foto (S0-03-CP1)", async () => {
    const resumen = await sembrarCatalogo(prisma, DATOS_EJEMPLO);
    expect(await contar()).toEqual(resumen);

    expect(await prisma.categoria.count()).toBeGreaterThanOrEqual(4);
    expect(await prisma.producto.count({ where: { activo: true } })).toBeGreaterThanOrEqual(20);
    expect(await prisma.producto.count({ where: { variantes: { none: {} } } })).toBe(0);
    expect(await prisma.producto.count({ where: { imagenes: { none: {} } } })).toBe(0);

    const camiseta = await prisma.producto.findUniqueOrThrow({
      where: { slug: "camiseta-basica-algodon" },
      include: { categoria: true, variantes: true },
    });
    expect(camiseta.precio).toBe(49_900);
    expect(camiseta.categoria.slug).toBe("ropa");
    expect(camiseta.variantes).toHaveLength(4);
  });

  it("no duplica nada si se ejecuta dos veces (S0-03-CP2)", async () => {
    await sembrarCatalogo(prisma, DATOS_EJEMPLO);
    const primeraVez = await contar();
    await sembrarCatalogo(prisma, DATOS_EJEMPLO);
    expect(await contar()).toEqual(primeraVez);
  });

  it("al repetir la carga conserva el stock real de las variantes", async () => {
    await sembrarCatalogo(prisma, DATOS_EJEMPLO);
    await prisma.varianteProducto.update({ where: { sku: "DEP-BAL-N5" }, data: { stock: 3 } });
    await sembrarCatalogo(prisma, DATOS_EJEMPLO);
    expect(
      (await prisma.varianteProducto.findUniqueOrThrow({ where: { sku: "DEP-BAL-N5" } })).stock,
    ).toBe(3);
  });

  it("con un dato inválido falla y no guarda nada (S0-03-CP4)", async () => {
    const datos = structuredClone(DATOS_EJEMPLO);
    datos.productos[20].variantes[0].stock = -1;
    await expect(sembrarCatalogo(prisma, datos)).rejects.toThrow(ErrorCatalogo);
    expect(await contar()).toEqual({ categorias: 0, productos: 0, variantes: 0, imagenes: 0 });
  });

  it("la base de datos también rechaza un stock negativo (restricción CHECK)", async () => {
    await sembrarCatalogo(prisma, DATOS_EJEMPLO);
    await expect(
      prisma.varianteProducto.update({ where: { sku: "DEP-BAL-N5" }, data: { stock: -1 } }),
    ).rejects.toThrow(/VarianteProducto_stock_no_negativo/);
  });

  it("la base de datos también rechaza un precio de 0 (restricción CHECK)", async () => {
    await sembrarCatalogo(prisma, DATOS_EJEMPLO);
    await expect(
      prisma.producto.update({ where: { slug: "camiseta-basica-algodon" }, data: { precio: 0 } }),
    ).rejects.toThrow(/Producto_precio_positivo/);
  });
});
