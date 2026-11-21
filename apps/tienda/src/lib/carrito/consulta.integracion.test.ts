// Pruebas de integración de la página del carrito (ZTV-17): usan PostgreSQL real.
// Igual que las demás pruebas de integración, BORRAN los datos y solo corren contra localhost.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client";
import { agregarAlCarrito } from "./carrito";
import {
  AVISO_NO_DISPONIBLE,
  AVISO_PRECIO_CAMBIO,
  avisoCantidadAjustada,
  consultarCarrito,
} from "./consulta";

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
  await bd.lineaCarrito.deleteMany();
  await bd.carrito.deleteMany();
  await bd.imagenProducto.deleteMany();
  await bd.varianteProducto.deleteMany();
  await bd.producto.deleteMany();
  await bd.categoria.deleteMany();
}

/** Producto con una variante (opcionalmente con talla y color); devuelve el id de la variante. */
async function crearVariante(
  slug: string,
  { precio, stock = 10, talla = null as string | null, color = null as string | null } = {
    precio: 49_900,
  },
) {
  const categoria = await bd.categoria.upsert({
    where: { slug: "ropa" },
    create: { nombre: "Ropa", slug: "ropa" },
    update: {},
  });
  const producto = await bd.producto.create({
    data: {
      nombre: `Producto ${slug}`,
      slug,
      descripcion: "Producto de prueba",
      precio,
      categoriaId: categoria.id,
      variantes: { create: [{ sku: `${slug}-v`, stock, talla, color }] },
      imagenes: {
        create: [{ url: `/productos/${slug}.webp`, textoAlternativo: "Foto", orden: 1 }],
      },
    },
    select: { variantes: { select: { id: true } } },
  });
  return producto.variantes[0].id;
}

/** Arma un carrito con [varianteId, cantidad] y devuelve su token. */
async function armarCarrito(lineas: [string, number][]) {
  let token: string | null = null;
  for (const [varianteId, cantidad] of lineas) {
    const r = await agregarAlCarrito(bd, { token, varianteId, cantidad });
    if (!r.ok) throw new Error(r.mensaje);
    token = r.token;
  }
  return token as string;
}

beforeEach(vaciar);
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

describe("consultarCarrito (ZTV-17)", () => {
  it("escenario 1 · líneas con precio, cantidad y total; subtotal y envío", async () => {
    const camiseta = await crearVariante("camiseta", {
      precio: 49_900,
      stock: 15,
      talla: "M",
      color: "Negro",
    });
    const lampara = await crearVariante("lampara", { precio: 89_900, stock: 12 });
    const token = await armarCarrito([
      [camiseta, 2],
      [lampara, 1],
    ]);

    const vista = await consultarCarrito(bd, token);
    expect(
      vista.lineas.map((l) => [l.producto, l.variante, l.precio, l.cantidad, l.total]),
    ).toEqual([
      ["Producto camiseta", "M / Negro", 49_900, 2, 99_800],
      ["Producto lampara", null, 89_900, 1, 89_900],
    ]);
    expect(vista).toMatchObject({
      unidades: 3,
      subtotal: 189_700,
      envio: 12_000,
      faltaParaEnvioGratis: 10_300,
      puedeContinuar: true,
    });
  });

  it("escenario 3 · sin cookie, con un token desconocido o vencido, el carrito está vacío", async () => {
    expect(await consultarCarrito(bd, null)).toMatchObject({ lineas: [], puedeContinuar: false });
    expect(await consultarCarrito(bd, "no-existe")).toMatchObject({ lineas: [] });

    const variante = await crearVariante("taza", { precio: 29_900 });
    const token = await armarCarrito([[variante, 1]]);
    const en31Dias = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(await consultarCarrito(bd, token, en31Dias)).toMatchObject({ lineas: [] });
  });

  it("CAR-02-CP5 · un producto desactivado queda «Ya no está disponible» y no suma", async () => {
    const camiseta = await crearVariante("camiseta", { precio: 49_900 });
    const gorra = await crearVariante("gorra", { precio: 59_900 });
    const token = await armarCarrito([
      [camiseta, 1],
      [gorra, 1],
    ]);
    await bd.producto.update({ where: { slug: "gorra" }, data: { activo: false } });

    const vista = await consultarCarrito(bd, token);
    const lineaGorra = vista.lineas.find((l) => l.producto === "Producto gorra");
    expect(lineaGorra).toMatchObject({
      disponible: false,
      total: 0,
      avisos: [AVISO_NO_DISPONIBLE],
    });
    expect(vista).toMatchObject({ subtotal: 49_900, unidades: 1, puedeContinuar: true });
  });

  it("escenario 4 · si ninguna línea queda disponible, no se puede continuar", async () => {
    const teclado = await crearVariante("teclado", { precio: 279_900, stock: 2 });
    const token = await armarCarrito([[teclado, 1]]);
    await bd.varianteProducto.update({ where: { id: teclado }, data: { stock: 0 } });

    expect(await consultarCarrito(bd, token)).toMatchObject({
      subtotal: 0,
      envio: 0,
      puedeContinuar: false,
    });
  });

  it("CAR-02-CP6 · si cambió el precio avisa una vez y el subtotal usa el precio nuevo", async () => {
    const lampara = await crearVariante("lampara", { precio: 89_900 });
    const token = await armarCarrito([[lampara, 2]]);
    await bd.producto.update({ where: { slug: "lampara" }, data: { precio: 79_900 } });

    const primera = await consultarCarrito(bd, token);
    expect(primera.lineas[0]).toMatchObject({ precio: 79_900, avisos: [AVISO_PRECIO_CAMBIO] });
    expect(primera.subtotal).toBe(159_800);

    const segunda = await consultarCarrito(bd, token);
    expect(segunda.lineas[0].avisos).toEqual([]);
  });

  it("RN4 · si el stock bajó, la cantidad se ajusta en la base y se avisa", async () => {
    const chaqueta = await crearVariante("chaqueta", { precio: 189_900, stock: 7 });
    const token = await armarCarrito([[chaqueta, 5]]);
    await bd.varianteProducto.update({ where: { id: chaqueta }, data: { stock: 3 } });

    const vista = await consultarCarrito(bd, token);
    expect(vista.lineas[0]).toMatchObject({
      cantidad: 3,
      total: 569_700,
      avisos: [avisoCantidadAjustada(3)],
    });
    expect(avisoCantidadAjustada(3)).toBe("Ajustamos la cantidad a las 3 unidades disponibles");
    expect((await bd.lineaCarrito.findFirstOrThrow()).cantidad).toBe(3);
    expect(vista).toMatchObject({ envio: 0, faltaParaEnvioGratis: 0 }); // $ 569.700 ≥ $ 200.000
  });
});
