// Pruebas de integración del listado de productos (ZTV-11, ZTV-40): usan PostgreSQL real.
// Igual que las demás pruebas de integración, BORRAN los datos y solo corren contra localhost.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client";
import { consultarPaginaProductos } from "./productos";

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

type Opciones = { activo?: boolean; creadoEn?: Date; stocks?: number[]; precio?: number };

async function crearProducto(categoriaId: string, n: number, opciones: Opciones = {}) {
  const { activo = true, creadoEn, stocks = [5], precio = 10_000 } = opciones;
  const slug = `producto-${String(n).padStart(2, "0")}`;
  await bd.producto.create({
    data: {
      nombre: `Producto ${String(n).padStart(2, "0")}`,
      slug,
      descripcion: "Producto de prueba",
      precio,
      activo,
      categoriaId,
      ...(creadoEn ? { creadoEn } : {}),
      variantes: { create: stocks.map((stock, i) => ({ sku: `${slug}-${i}`, stock })) },
      imagenes: {
        create: [
          { url: `/productos/${slug}-2.svg`, textoAlternativo: "Segunda foto", orden: 2 },
          { url: `/productos/${slug}.svg`, textoAlternativo: `Foto de ${slug}`, orden: 1 },
        ],
      },
    },
  });
}

async function crearCategoria() {
  const categoria = await bd.categoria.create({ data: { nombre: "Prueba", slug: "prueba" } });
  return categoria.id;
}

beforeEach(vaciar);
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

describe("consultarPaginaProductos", () => {
  it("CAT-02-CP6 · sin productos activos devuelve una lista vacía y una sola página", async () => {
    const categoria = await crearCategoria();
    await crearProducto(categoria, 1, { activo: false });

    expect(await consultarPaginaProductos(bd, 1)).toEqual({
      productos: [],
      pagina: 1,
      totalPaginas: 1,
      total: 0,
    });
  });

  it("RN1 · no incluye productos inactivos", async () => {
    const categoria = await crearCategoria();
    await crearProducto(categoria, 1);
    await crearProducto(categoria, 2, { activo: false });

    const resultado = await consultarPaginaProductos(bd, 1);
    expect(resultado.productos.map((p) => p.slug)).toEqual(["producto-01"]);
    expect(resultado.total).toBe(1);
  });

  it("escenario 1 · ordena del más reciente al más antiguo", async () => {
    const categoria = await crearCategoria();
    await crearProducto(categoria, 1, { creadoEn: new Date("2026-11-01") });
    await crearProducto(categoria, 2, { creadoEn: new Date("2026-11-03") });
    await crearProducto(categoria, 3, { creadoEn: new Date("2026-11-02") });

    const { productos } = await consultarPaginaProductos(bd, 1);
    expect(productos.map((p) => p.slug)).toEqual(["producto-02", "producto-03", "producto-01"]);
  });

  it("escenario 2 y RN5 · 20 productos: 12 en la página 1, 8 en la 2, y ?pagina=99 da la 2", async () => {
    const categoria = await crearCategoria();
    for (let n = 1; n <= 20; n++) await crearProducto(categoria, n);

    const primera = await consultarPaginaProductos(bd, 1);
    const segunda = await consultarPaginaProductos(bd, 2);
    const inexistente = await consultarPaginaProductos(bd, 99);

    expect(primera.productos).toHaveLength(12);
    expect(segunda.productos).toHaveLength(8);
    expect(segunda).toMatchObject({ pagina: 2, totalPaginas: 2, total: 20 });
    expect(inexistente).toEqual(segunda);
    const todos = [...primera.productos, ...segunda.productos].map((p) => p.slug);
    expect(new Set(todos).size).toBe(20);
  });

  it("arma la tarjeta: precio con formato, agotado y la foto de orden 1", async () => {
    const categoria = await crearCategoria();
    await crearProducto(categoria, 1, { stocks: [0, 0], precio: 89_900 });

    const [tarjeta] = (await consultarPaginaProductos(bd, 1)).productos;
    expect(tarjeta).toEqual({
      nombre: "Producto 01",
      slug: "producto-01",
      textoPrecio: "$ 89.900",
      agotado: true,
      imagen: { url: "/productos/producto-01.svg", textoAlternativo: "Foto de producto-01" },
    });
  });
});
