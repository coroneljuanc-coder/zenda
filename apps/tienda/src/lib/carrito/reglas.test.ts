import { describe, expect, it } from "vitest";
import { cantidadMaxima, textoAgregado, validarCantidad, vencimientoDesde } from "./reglas";

describe("validarCantidad (RN1 y escenario 3 de ZTV-16)", () => {
  it("CAR-01-CP3 · con stock 4 y 3 en el carrito, agregar 2 se rechaza con el mensaje exacto", () => {
    expect(validarCantidad({ enCarrito: 3, agregar: 2, stock: 4 })).toEqual({
      ok: false,
      mensaje: "Solo hay 4 unidades disponibles. Ya tienes 3 en tu carrito.",
    });
  });

  it("CAR-01-CP4 · máximo 10 por producto aunque haya más stock", () => {
    expect(validarCantidad({ enCarrito: 0, agregar: 11, stock: 50 })).toEqual({
      ok: false,
      mensaje: "Puedes llevar hasta 10 unidades de cada producto.",
    });
  });

  it("CAR-01-CP4 · mínimo 1: 0 o un número no entero se rechazan", () => {
    expect(validarCantidad({ enCarrito: 0, agregar: 0, stock: 50 })).toMatchObject({ ok: false });
    expect(validarCantidad({ enCarrito: 0, agregar: 1.5, stock: 50 })).toMatchObject({ ok: false });
  });

  it("valores límite: exactamente 10 y exactamente el stock se aceptan", () => {
    expect(validarCantidad({ enCarrito: 0, agregar: 10, stock: 50 })).toEqual({
      ok: true,
      total: 10,
    });
    expect(validarCantidad({ enCarrito: 3, agregar: 1, stock: 4 })).toEqual({ ok: true, total: 4 });
  });

  it("escenario 2 · suma lo que ya había en el carrito", () => {
    expect(validarCantidad({ enCarrito: 1, agregar: 2, stock: 15 })).toEqual({
      ok: true,
      total: 3,
    });
  });

  it("singular: con 1 unidad en stock el mensaje lo dice bien", () => {
    expect(validarCantidad({ enCarrito: 0, agregar: 2, stock: 1 })).toEqual({
      ok: false,
      mensaje: "Solo hay 1 unidad disponible.",
    });
  });

  it("RN4 · sin stock no se puede agregar", () => {
    expect(validarCantidad({ enCarrito: 0, agregar: 1, stock: 0 })).toMatchObject({ ok: false });
  });
});

describe("cantidadMaxima", () => {
  it("es el menor entre el stock y 10, menos lo que ya hay", () => {
    expect(cantidadMaxima(4)).toBe(4);
    expect(cantidadMaxima(50)).toBe(10);
    expect(cantidadMaxima(50, 7)).toBe(3);
    expect(cantidadMaxima(4, 4)).toBe(0);
  });
});

describe("vencimientoDesde (RN5)", () => {
  it("un carrito vence 30 días después de su última modificación", () => {
    expect(vencimientoDesde(new Date("2026-11-21T10:00:00Z")).toISOString()).toBe(
      "2026-12-21T10:00:00.000Z",
    );
  });
});

describe("textoAgregado (escenario 1)", () => {
  it("arma el aviso con la cantidad y el nombre", () => {
    expect(textoAgregado(2, "Camiseta básica de algodón")).toBe(
      "Agregaste 2 × Camiseta básica de algodón al carrito",
    );
  });
});
