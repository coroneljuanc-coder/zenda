// Pruebas de integración de los datos de envío (ZTV-19): usan PostgreSQL real.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { guardarDatosEntrega, leerDatosEntrega } from "./entrega";
import { DATOS_ANA, armarCarrito, bd, crearCamiseta, vaciar } from "./pruebas-bd";

beforeEach(vaciar);
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

describe("guardar y leer los datos de envío (RN4)", () => {
  it("se guardan junto al carrito con los nombres DANE y la fecha de autorización (RN2)", async () => {
    const token = await armarCarrito(await crearCamiseta(), 3);
    const ahora = new Date("2026-11-22T15:00:00Z");
    expect(await guardarDatosEntrega(bd, { token, datos: DATOS_ANA, ahora })).toEqual({ ok: true });

    const fila = await bd.datosEntrega.findFirstOrThrow();
    expect(fila).toMatchObject({
      departamento: "Antioquia",
      ciudad: "Medellín",
      codigoDane: "05001",
      aceptoPoliticaEn: ahora,
    });
    expect(await leerDatosEntrega(bd, token, ahora)).toEqual({
      nombreCompleto: "Ana Prueba",
      correo: "ana@ejemplo.com",
      celular: "3001234567",
      departamento: "05",
      departamentoNombre: "Antioquia",
      ciudad: "05001",
      ciudadNombre: "Medellín",
      direccion: "Cra 1 # 2-3",
      detalles: null,
      notas: null,
    });
  });

  it("escenario 2: al editar se reemplazan, sin duplicar", async () => {
    const token = await armarCarrito(await crearCamiseta(), 1);
    await guardarDatosEntrega(bd, { token, datos: DATOS_ANA });
    await guardarDatosEntrega(bd, {
      token,
      datos: { ...DATOS_ANA, departamento: "11", ciudad: "11001", notas: "Portería" },
    });
    expect(await bd.datosEntrega.count()).toBe(1);
    expect(await leerDatosEntrega(bd, token)).toMatchObject({
      ciudadNombre: "Bogotá, D.C.",
      notas: "Portería",
    });
  });

  it("sin carrito o con el carrito vencido no se guarda nada", async () => {
    expect(await guardarDatosEntrega(bd, { token: undefined, datos: DATOS_ANA })).toEqual({
      ok: false,
      motivo: "sin-carrito",
    });
    const token = await armarCarrito(await crearCamiseta(), 1);
    const en31Dias = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    expect(await guardarDatosEntrega(bd, { token, datos: DATOS_ANA, ahora: en31Dias })).toEqual({
      ok: false,
      motivo: "sin-carrito",
    });
    expect(await bd.datosEntrega.count()).toBe(0);
    expect(await leerDatosEntrega(bd, "otro-token")).toBeNull();
  });

  it("se borran con el carrito (duran lo mismo que él)", async () => {
    const token = await armarCarrito(await crearCamiseta(), 1);
    await guardarDatosEntrega(bd, { token, datos: DATOS_ANA });
    await bd.carrito.delete({ where: { token } });
    expect(await bd.datosEntrega.count()).toBe(0);
  });
});
