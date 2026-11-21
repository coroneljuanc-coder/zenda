import { describe, expect, it } from "vitest";
import { calcularEnvio, calcularSubtotal, faltaParaEnvioGratis, totalLinea } from "./precios";

describe("calcularSubtotal (RN1 y RN2 de ZTV-17)", () => {
  it("CAR-02-CP1 · 2 camisetas de $ 49.900 y 1 lámpara de $ 89.900 suman $ 189.700", () => {
    expect(
      calcularSubtotal([
        { precio: 49_900, cantidad: 2 },
        { precio: 89_900, cantidad: 1 },
      ]),
    ).toBe(189_700);
  });

  it("el ejemplo de la ficha: 2 × $ 45.000 y 1 × $ 120.000 suman $ 210.000", () => {
    expect(
      calcularSubtotal([
        { precio: 45_000, cantidad: 2 },
        { precio: 120_000, cantidad: 1 },
      ]),
    ).toBe(210_000);
  });

  it("sin líneas el subtotal es 0", () => {
    expect(calcularSubtotal([])).toBe(0);
  });

  it("total de línea = precio × cantidad", () => {
    expect(totalLinea({ precio: 45_000, cantidad: 3 })).toBe(135_000);
  });
});

describe("calcularEnvio (RN3, D3)", () => {
  it("CAR-02-CP2 · valores límite: $ 199.999 paga $ 12.000 y $ 200.000 no paga", () => {
    expect(calcularEnvio(199_999)).toBe(12_000);
    expect(calcularEnvio(200_000)).toBe(0);
  });

  it("un carrito sin productos no cobra envío", () => {
    expect(calcularEnvio(0)).toBe(0);
  });
});

describe("faltaParaEnvioGratis (escenario 2)", () => {
  it("CAR-02-CP3 · con $ 189.700 faltan $ 10.300", () => {
    expect(faltaParaEnvioGratis(189_700)).toBe(10_300);
  });

  it("con $ 200.000 o más no falta nada", () => {
    expect(faltaParaEnvioGratis(200_000)).toBe(0);
    expect(faltaParaEnvioGratis(250_000)).toBe(0);
  });
});
