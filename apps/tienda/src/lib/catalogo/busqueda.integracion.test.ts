// Pruebas de integración de la búsqueda (ZTV-14): base real con productos propios de la prueba.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { bd, vaciar } from "../compra/pruebas-bd";
import { buscarProductos } from "./busqueda";

beforeEach(async () => {
  await vaciar();
  const categoria = await bd.categoria.create({
    data: { nombre: "Hogar", slug: "hogar-prueba", orden: 1 },
  });
  const producto = (nombre: string, slug: string, descripcion: string, activo = true, dias = 0) =>
    bd.producto.create({
      data: {
        nombre,
        slug,
        descripcion,
        precio: 50_000,
        activo,
        categoriaId: categoria.id,
        creadoEn: new Date(Date.UTC(2026, 10, 1 + dias)),
        variantes: { create: [{ sku: `${slug}-u`, stock: 5 }] },
      },
    });
  await producto("Lámpara de mesa", "lampara", "Luz cálida para leer.");
  await producto("Camiseta básica de algodón", "camiseta", "Tela suave.", true, 1);
  await producto("Cojín decorativo", "cojin", "Funda 100 % algodón lavable.", true, 2);
  await producto("Toalla de algodón", "toalla", "Absorbente.", false, 3);
});
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

const nombres = async (texto: string) =>
  (await buscarProductos(bd, texto, 1)).productos.map((p) => p.nombre);

describe("buscarProductos (ZTV-14)", () => {
  it("CAT-05-CP2 · RN2 · «LAMPARA» encuentra «Lámpara de mesa»", async () => {
    expect(await nombres("LAMPARA")).toEqual(["Lámpara de mesa"]);
    expect(await nombres("cálida")).toEqual(["Lámpara de mesa"]);
  });

  it("CAT-05-CP5 · RN1 y RN4 · «algodon»: primero por nombre, luego por descripción; sin inactivos", async () => {
    expect(await nombres("algodon")).toEqual(["Camiseta básica de algodón", "Cojín decorativo"]);
  });

  it("CAT-05-CP6 · texto con SQL o comodines: sin error y sin resultados de más", async () => {
    expect(await nombres("' OR 1=1 --")).toEqual([]);
    expect(await nombres("%")).toEqual(["Cojín decorativo"]); // «100 %» en la descripción
    expect(await nombres("__")).toEqual([]);
  });

  it("RN5 · paginación del listado: total y páginas", async () => {
    const r = await buscarProductos(bd, "a", 1, 2);
    expect(r).toMatchObject({ total: 3, totalPaginas: 2, pagina: 1 });
    expect((await buscarProductos(bd, "a", 9, 2)).pagina).toBe(2);
  });
});
