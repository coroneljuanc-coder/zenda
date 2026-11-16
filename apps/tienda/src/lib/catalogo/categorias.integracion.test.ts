// Prueba de integración del menú de categorías (ZTV-35, RN1 de ZTV-10): usa PostgreSQL real.
// Igual que las demás pruebas de integración, BORRA los datos y solo corre contra localhost.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client";
import { consultarCategoriasMenu } from "./categorias";

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

const bd = new PrismaClient({ adapter: new PrismaPg({ connectionString: conexion }) });

async function vaciar() {
  await bd.imagenProducto.deleteMany();
  await bd.varianteProducto.deleteMany();
  await bd.producto.deleteMany();
  await bd.categoria.deleteMany();
}

beforeEach(vaciar);
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

describe("consultarCategoriasMenu", () => {
  it("RN1 · devuelve las categorías en el orden del campo `orden`, no en el de creación", async () => {
    await bd.categoria.createMany({
      data: [
        { nombre: "Tecnología", slug: "tecnologia", orden: 3 },
        { nombre: "Ropa", slug: "ropa", orden: 1 },
        { nombre: "Hogar", slug: "hogar", orden: 2 },
      ],
    });

    const categorias = await consultarCategoriasMenu(bd);

    expect(categorias).toEqual([
      { nombre: "Ropa", slug: "ropa" },
      { nombre: "Hogar", slug: "hogar" },
      { nombre: "Tecnología", slug: "tecnologia" },
    ]);
  });

  it("a igual orden, ordena por nombre", async () => {
    await bd.categoria.createMany({
      data: [
        { nombre: "Zapatos", slug: "zapatos", orden: 1 },
        { nombre: "Accesorios", slug: "accesorios", orden: 1 },
      ],
    });

    const categorias = await consultarCategoriasMenu(bd);

    expect(categorias.map((c) => c.nombre)).toEqual(["Accesorios", "Zapatos"]);
  });

  it("sin categorías devuelve una lista vacía", async () => {
    expect(await consultarCategoriasMenu(bd)).toEqual([]);
  });
});
