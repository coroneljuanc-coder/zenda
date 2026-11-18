import { describe, expect, it } from "vitest";
import {
  ajustarPagina,
  estaAgotado,
  interpretarPagina,
  stockTotal,
  textoDisponibilidad,
  textoPrecio,
} from "./reglas";

describe("estaAgotado (RN4)", () => {
  it("CAT-02-CP4 · variantes con stock 0 y 0 → agotado", () => {
    expect(
      estaAgotado([
        { stock: 0, precio: null },
        { stock: 0, precio: null },
      ]),
    ).toBe(true);
  });

  it("con al menos una unidad en alguna variante → disponible", () => {
    expect(
      estaAgotado([
        { stock: 0, precio: null },
        { stock: 1, precio: null },
      ]),
    ).toBe(false);
  });

  it("sin variantes → agotado (no hay nada que vender)", () => {
    expect(estaAgotado([])).toBe(true);
  });
});

describe("textoPrecio (RN2 y RN3)", () => {
  it("CAT-02-CP5 · variantes de 50.000 y 45.000 → «Desde $ 45.000»", () => {
    expect(
      textoPrecio(60_000, [
        { stock: 1, precio: 50_000 },
        { stock: 1, precio: 45_000 },
      ]),
    ).toBe("Desde $ 45.000");
  });

  it("variantes sin precio propio usan el del producto → «$ 89.900»", () => {
    expect(
      textoPrecio(89_900, [
        { stock: 3, precio: null },
        { stock: 5, precio: null },
      ]),
    ).toBe("$ 89.900");
  });

  it("una variante con precio propio y otra con el del producto (botella del seed)", () => {
    expect(
      textoPrecio(59_900, [
        { stock: 12, precio: 49_900 },
        { stock: 10, precio: null },
      ]),
    ).toBe("Desde $ 49.900");
  });

  it("precio propio igual al del producto no es «Desde»", () => {
    expect(
      textoPrecio(30_000, [
        { stock: 1, precio: 30_000 },
        { stock: 1, precio: null },
      ]),
    ).toBe("$ 30.000");
  });

  it("sin variantes usa el precio del producto", () => {
    expect(textoPrecio(1_250_000, [])).toBe("$ 1.250.000");
  });
});

describe("interpretarPagina", () => {
  it.each([
    [undefined, 1],
    ["", 1],
    ["2", 2],
    ["0", 1],
    ["-3", 1],
    ["1.5", 1],
    ["abc", 1],
    [["3", "4"], 3],
    ["99999999999999999999", 1],
  ])("?pagina=%j → %i", (valor, esperado) => {
    expect(interpretarPagina(valor)).toBe(esperado);
  });
});

describe("ajustarPagina (RN5)", () => {
  it("20 productos son 2 páginas de 12", () => {
    expect(ajustarPagina(2, 20)).toEqual({ pagina: 2, totalPaginas: 2 });
  });

  it("una página inexistente muestra la última válida", () => {
    expect(ajustarPagina(99, 20)).toEqual({ pagina: 2, totalPaginas: 2 });
  });

  it("exactamente 12 productos son 1 página", () => {
    expect(ajustarPagina(2, 12)).toEqual({ pagina: 1, totalPaginas: 1 });
  });

  it("sin productos hay una sola página", () => {
    expect(ajustarPagina(5, 0)).toEqual({ pagina: 1, totalPaginas: 1 });
  });
});

describe("textoDisponibilidad (RN2 de ZTV-13)", () => {
  it("CAT-04-CP2 · 3 unidades → «¡Últimas 3 unidades!»", () => {
    expect(textoDisponibilidad(3)).toBe("¡Últimas 3 unidades!");
  });

  it("CAT-04-CP3 · valores límite: 6 → «Disponible» y 5 → «¡Últimas 5 unidades!»", () => {
    expect(textoDisponibilidad(6)).toBe("Disponible");
    expect(textoDisponibilidad(5)).toBe("¡Últimas 5 unidades!");
  });

  it("CAT-04-CP4 · 0 unidades → «Agotado»", () => {
    expect(textoDisponibilidad(0)).toBe("Agotado");
  });

  it("1 unidad → «¡Última unidad!» (singular)", () => {
    expect(textoDisponibilidad(1)).toBe("¡Última unidad!");
  });

  it("muchas unidades no muestran el número exacto", () => {
    expect(textoDisponibilidad(250)).toBe("Disponible");
  });
});

describe("stockTotal", () => {
  it("suma el stock de todas las variantes", () => {
    expect(
      stockTotal([
        { stock: 0, precio: null },
        { stock: 7, precio: null },
        { stock: 3, precio: 10_000 },
      ]),
    ).toBe(10);
  });
});
