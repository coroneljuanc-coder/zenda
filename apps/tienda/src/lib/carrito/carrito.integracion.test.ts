// Pruebas de integración del carrito (ZTV-16): usan PostgreSQL real.
// Igual que las demás pruebas de integración, BORRAN los datos y solo corren contra localhost.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "../../generated/prisma/client";
import {
  agregarAlCarrito,
  cambiarCantidad,
  contarUnidades,
  eliminarLinea,
  TEXTO_SIN_MAS_UNIDADES,
} from "./carrito";

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

/** Un producto con una sola variante; devuelve el id de la variante. */
async function crearVariante({ stock = 10, activo = true, slug = "camiseta" } = {}) {
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
      precio: 49_900,
      activo,
      categoriaId: categoria.id,
      variantes: { create: [{ sku: `${slug}-unica`, stock }] },
    },
    select: { variantes: { select: { id: true } } },
  });
  return producto.variantes[0].id;
}

beforeEach(vaciar);
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

describe("agregarAlCarrito (ZTV-16)", () => {
  it("escenario 1 · sin carrito crea uno con un token nuevo y suma las unidades", async () => {
    const varianteId = await crearVariante({ stock: 15 });
    const resultado = await agregarAlCarrito(bd, { token: null, varianteId, cantidad: 2 });

    expect(resultado).toMatchObject({
      ok: true,
      producto: "Producto camiseta",
      cantidad: 2,
      unidadesEnCarrito: 2,
    });
    if (!resultado.ok) throw new Error("debía agregar");
    expect(resultado.token).toMatch(/^[A-Za-z0-9_-]{43}$/); // 256 bits aleatorios
    expect(await contarUnidades(bd, resultado.token)).toBe(2);
  });

  it("CAR-01-CP2 · agregar 1 y luego 2 de la misma variante deja una sola línea con 3", async () => {
    const varianteId = await crearVariante({ stock: 15 });
    const primero = await agregarAlCarrito(bd, { varianteId, cantidad: 1 });
    if (!primero.ok) throw new Error("debía agregar");
    const segundo = await agregarAlCarrito(bd, { token: primero.token, varianteId, cantidad: 2 });

    expect(segundo).toMatchObject({ ok: true, token: primero.token, unidadesEnCarrito: 3 });
    const lineas = await bd.lineaCarrito.findMany();
    expect(lineas).toHaveLength(1);
    expect(lineas[0].cantidad).toBe(3);
  });

  it("escenario 3 · superar el stock no cambia el carrito", async () => {
    const varianteId = await crearVariante({ stock: 4 });
    const primero = await agregarAlCarrito(bd, { varianteId, cantidad: 3 });
    if (!primero.ok) throw new Error("debía agregar");
    const segundo = await agregarAlCarrito(bd, { token: primero.token, varianteId, cantidad: 2 });

    expect(segundo).toEqual({
      ok: false,
      mensaje: "Solo hay 4 unidades disponibles. Ya tienes 3 en tu carrito.",
      unidadesEnCarrito: 3,
    });
    expect((await bd.lineaCarrito.findFirstOrThrow()).cantidad).toBe(3);
  });

  it("CAR-01-CP6 · RN4 · una petición directa con un producto agotado o inactivo se rechaza", async () => {
    const agotada = await crearVariante({ stock: 0, slug: "teclado" });
    const inactiva = await crearVariante({ stock: 2, activo: false, slug: "gorra" });

    for (const varianteId of [agotada, inactiva, "variante-que-no-existe"]) {
      expect(await agregarAlCarrito(bd, { varianteId, cantidad: 1 })).toEqual({
        ok: false,
        mensaje: "Este producto no está disponible por ahora.",
        unidadesEnCarrito: 0,
      });
    }
    expect(await bd.carrito.count()).toBe(0); // un rechazo no crea carritos vacíos
  });

  it("guarda el precio que vio el visitante (para avisar si cambia en ZTV-17)", async () => {
    const varianteId = await crearVariante({ stock: 15 });
    await agregarAlCarrito(bd, { varianteId, cantidad: 1 });
    expect((await bd.lineaCarrito.findFirstOrThrow()).precioVisto).toBe(49_900);
  });

  it("RN3 · agregar no descuenta ni reserva inventario", async () => {
    const varianteId = await crearVariante({ stock: 15 });
    await agregarAlCarrito(bd, { varianteId, cantidad: 5 });
    expect((await bd.varianteProducto.findUniqueOrThrow({ where: { id: varianteId } })).stock).toBe(
      15,
    );
  });

  it("RN5 · un carrito vencido no se usa: se crea uno nuevo", async () => {
    const varianteId = await crearVariante({ stock: 15 });
    const hace31Dias = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    const viejo = await agregarAlCarrito(bd, { varianteId, cantidad: 1 }, hace31Dias);
    if (!viejo.ok) throw new Error("debía agregar");

    expect(await contarUnidades(bd, viejo.token)).toBe(0);
    const nuevo = await agregarAlCarrito(bd, { token: viejo.token, varianteId, cantidad: 2 });
    expect(nuevo).toMatchObject({ ok: true, unidadesEnCarrito: 2 });
    if (!nuevo.ok) throw new Error("debía agregar");
    expect(nuevo.token).not.toBe(viejo.token);
  });

  it("RN1 · la base rechaza una cantidad fuera de 1 a 10 (restricción CHECK)", async () => {
    const varianteId = await crearVariante({ stock: 15 });
    const resultado = await agregarAlCarrito(bd, { varianteId, cantidad: 1 });
    if (!resultado.ok) throw new Error("debía agregar");
    await expect(
      bd.lineaCarrito.updateMany({ where: { varianteId }, data: { cantidad: 11 } }),
    ).rejects.toThrow(/LineaCarrito_cantidad_rango/);
  });
});

/** Agrega una variante y devuelve el token y el id de la línea. */
async function conLinea(varianteId: string, cantidad: number) {
  const r = await agregarAlCarrito(bd, { varianteId, cantidad });
  if (!r.ok) throw new Error(r.mensaje);
  const linea = await bd.lineaCarrito.findFirstOrThrow({ where: { varianteId } });
  return { token: r.token, lineaId: linea.id };
}

describe("cambiarCantidad y eliminarLinea (ZTV-18)", () => {
  it("escenario 1 · sube y baja la cantidad de la línea", async () => {
    const varianteId = await crearVariante({ stock: 15 });
    const { token, lineaId } = await conLinea(varianteId, 2);

    expect(await cambiarCantidad(bd, { token, lineaId, cantidad: 3 })).toEqual({
      ok: true,
      cantidad: 3,
      unidadesEnCarrito: 3,
    });
    expect(await cambiarCantidad(bd, { token, lineaId, cantidad: 1 })).toMatchObject({
      ok: true,
      cantidad: 1,
    });
  });

  it("CAR-03-CP4 · con stock 3 y 3 en el carrito, pedir 4 se rechaza y queda en 3", async () => {
    const varianteId = await crearVariante({ stock: 3 });
    const { token, lineaId } = await conLinea(varianteId, 3);

    expect(await cambiarCantidad(bd, { token, lineaId, cantidad: 4 })).toEqual({
      ok: false,
      mensaje: TEXTO_SIN_MAS_UNIDADES,
      cantidad: 3,
    });
    expect((await bd.lineaCarrito.findUniqueOrThrow({ where: { id: lineaId } })).cantidad).toBe(3);
  });

  it("RN1 · no baja de 1 ni sube de 10 aunque haya más stock", async () => {
    const varianteId = await crearVariante({ stock: 50 });
    const { token, lineaId } = await conLinea(varianteId, 5);
    expect(await cambiarCantidad(bd, { token, lineaId, cantidad: 0 })).toMatchObject({ ok: false });
    expect(await cambiarCantidad(bd, { token, lineaId, cantidad: 11 })).toMatchObject({
      ok: false,
      cantidad: 5,
    });
  });

  it("RN4 · nadie puede cambiar ni eliminar una línea de otro carrito", async () => {
    const varianteId = await crearVariante({ stock: 15 });
    const { lineaId } = await conLinea(varianteId, 2);
    const otro = await agregarAlCarrito(bd, {
      varianteId: await crearVariante({ stock: 5, slug: "taza" }),
      cantidad: 1,
    });
    if (!otro.ok) throw new Error("debía agregar");

    expect(await cambiarCantidad(bd, { token: otro.token, lineaId, cantidad: 3 })).toMatchObject({
      ok: false,
    });
    expect(await eliminarLinea(bd, { token: otro.token, lineaId })).toMatchObject({ ok: false });
    expect((await bd.lineaCarrito.findUniqueOrThrow({ where: { id: lineaId } })).cantidad).toBe(2);
  });

  it("escenario 2 · eliminar quita la línea y «Deshacer» la devuelve con la misma cantidad", async () => {
    const varianteId = await crearVariante({ stock: 15 });
    const { token, lineaId } = await conLinea(varianteId, 4);

    const eliminado = await eliminarLinea(bd, { token, lineaId });
    expect(eliminado).toEqual({ ok: true, producto: "Producto camiseta", varianteId, cantidad: 4 });
    expect(await contarUnidades(bd, token)).toBe(0); // RN3: el carrito queda vacío

    // «Deshacer» = volver a agregar la misma variante y cantidad (RN2).
    if (!eliminado.ok) throw new Error("debía eliminar");
    const devuelto = await agregarAlCarrito(bd, {
      token,
      varianteId: eliminado.varianteId,
      cantidad: eliminado.cantidad,
    });
    expect(devuelto).toMatchObject({ ok: true, unidadesEnCarrito: 4 });
  });

  it("RN2 · si el stock ya no alcanza, «Deshacer» no devuelve la línea y lo explica", async () => {
    const varianteId = await crearVariante({ stock: 5 });
    const { token, lineaId } = await conLinea(varianteId, 4);
    await eliminarLinea(bd, { token, lineaId });
    await bd.varianteProducto.update({ where: { id: varianteId }, data: { stock: 2 } });

    expect(await agregarAlCarrito(bd, { token, varianteId, cantidad: 4 })).toEqual({
      ok: false,
      mensaje: "Solo hay 2 unidades disponibles.",
      unidadesEnCarrito: 0,
    });
  });
});
