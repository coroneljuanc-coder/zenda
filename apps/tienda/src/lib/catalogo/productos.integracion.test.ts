// Pruebas de integración del listado de productos (ZTV-11, ZTV-40): usan PostgreSQL real.
// Igual que las demás pruebas de integración, BORRAN los datos y solo corren contra localhost.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client";
import { consultarCategoria } from "./categorias";
import { consultarPaginaProductos, consultarProducto, consultarSlugsProductos } from "./productos";

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

async function crearCategoria(slug = "prueba") {
  const categoria = await bd.categoria.create({ data: { nombre: `Categoría ${slug}`, slug } });
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

describe("consultarPaginaProductos por categoría (ZTV-12)", () => {
  it("CAT-03-CP2 · solo los productos activos de esa categoría", async () => {
    const hogar = await crearCategoria("hogar");
    const ropa = await crearCategoria("ropa");
    await crearProducto(hogar, 1);
    await crearProducto(hogar, 2, { activo: false });
    await crearProducto(ropa, 3);

    const resultado = await consultarPaginaProductos(bd, 1, { categoriaId: hogar });
    expect(resultado.productos.map((p) => p.slug)).toEqual(["producto-01"]);
    expect(resultado).toMatchObject({ total: 1, pagina: 1, totalPaginas: 1 });
  });

  it("CAT-03-CP3 · una categoría sin productos activos devuelve una lista vacía", async () => {
    const vacia = await crearCategoria("vacia");
    const otra = await crearCategoria("otra");
    await crearProducto(otra, 1);
    await crearProducto(vacia, 2, { activo: false });

    expect(await consultarPaginaProductos(bd, 1, { categoriaId: vacia })).toEqual({
      productos: [],
      pagina: 1,
      totalPaginas: 1,
      total: 0,
    });
  });

  it("RN1 de CAT-03 · la paginación por categoría usa las mismas reglas (12 + 1)", async () => {
    const hogar = await crearCategoria("hogar");
    for (let n = 1; n <= 13; n++) await crearProducto(hogar, n);

    const segunda = await consultarPaginaProductos(bd, 5, { categoriaId: hogar });
    expect(segunda).toMatchObject({ pagina: 2, totalPaginas: 2, total: 13 });
    expect(segunda.productos).toHaveLength(1);
  });
});

describe("consultarCategoria (ZTV-12)", () => {
  it("RN3 · encuentra la categoría por su slug", async () => {
    await bd.categoria.create({
      data: { nombre: "Hogar", slug: "hogar", descripcion: "Cocina, descanso y decoración." },
    });
    expect(await consultarCategoria(bd, "hogar")).toMatchObject({
      nombre: "Hogar",
      slug: "hogar",
      descripcion: "Cocina, descanso y decoración.",
    });
  });

  it("escenario 3 · un slug que no existe devuelve null (página 404)", async () => {
    expect(await consultarCategoria(bd, "no-existe")).toBeNull();
  });
});

describe("consultarProducto (ZTV-13)", () => {
  it("arma la ficha: todas las fotos en orden (RN1), precio, disponibilidad y categoría", async () => {
    const categoria = await crearCategoria("hogar");
    await crearProducto(categoria, 1, { stocks: [2, 1], precio: 89_900 });

    expect(await consultarProducto(bd, "producto-01")).toEqual({
      nombre: "Producto 01",
      slug: "producto-01",
      descripcion: "Producto de prueba",
      textoPrecio: "$ 89.900",
      unidades: 3,
      disponibilidad: "¡Últimas 3 unidades!",
      agotado: false,
      categoria: { nombre: "Categoría hogar", slug: "hogar" },
      imagenes: [
        { url: "/productos/producto-01.svg", textoAlternativo: "Foto de producto-01" },
        { url: "/productos/producto-01-2.svg", textoAlternativo: "Segunda foto" },
      ],
      // ZTV-15: variantes en orden de SKU, sin talla ni color, con el precio del producto (RN1).
      variantes: [
        expect.objectContaining({
          sku: "producto-01-0",
          talla: null,
          color: null,
          stock: 2,
          precio: 89_900,
        }),
        expect.objectContaining({
          sku: "producto-01-1",
          talla: null,
          color: null,
          stock: 1,
          precio: 89_900,
        }),
      ],
    });
  });

  it("ZTV-15 · RN1 · una variante con precio propio lo conserva en la ficha", async () => {
    const categoria = await crearCategoria();
    await crearProducto(categoria, 1, { stocks: [4], precio: 59_900 });
    await bd.varianteProducto.update({ where: { sku: "producto-01-0" }, data: { precio: 49_900 } });
    const ficha = await consultarProducto(bd, "producto-01");
    expect(ficha?.variantes).toEqual([expect.objectContaining({ precio: 49_900 })]);
  });

  it("escenario 3 · un producto sin unidades queda agotado", async () => {
    const categoria = await crearCategoria();
    await crearProducto(categoria, 1, { stocks: [0, 0] });
    expect(await consultarProducto(bd, "producto-01")).toMatchObject({
      unidades: 0,
      disponibilidad: "Agotado",
      agotado: true,
    });
  });

  it("CAT-04-CP5 · RN3 · un producto inactivo no es accesible (null → 404)", async () => {
    const categoria = await crearCategoria();
    await crearProducto(categoria, 1, { activo: false });
    expect(await consultarProducto(bd, "producto-01")).toBeNull();
  });

  it("escenario 4 · un slug que no existe devuelve null (404)", async () => {
    expect(await consultarProducto(bd, "no-existe")).toBeNull();
  });

  it("consultarSlugsProductos solo incluye productos activos", async () => {
    const categoria = await crearCategoria();
    await crearProducto(categoria, 1);
    await crearProducto(categoria, 2, { activo: false });
    expect(await consultarSlugsProductos(bd)).toEqual(["producto-01"]);
  });
});
