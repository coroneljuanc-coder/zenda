import { describe, expect, it } from "vitest";
import { FORMATO_REFERENCIA, generarReferencia, generarTokenAcceso } from "./referencia";

describe("referencia del pedido (RN3 de ZTV-20)", () => {
  it("COM-02-CP7 · 10.000 referencias con el formato ZEN-AAAAMMDD-XXXXX y la fecha de Colombia", () => {
    // 23:30 del 22 de noviembre en Bogotá ya es 23 de noviembre en UTC.
    const fecha = new Date("2026-11-23T04:30:00Z");
    const referencias = Array.from({ length: 10_000 }, () => generarReferencia(fecha));
    for (const r of referencias) {
      expect(r).toMatch(FORMATO_REFERENCIA);
      expect(r.startsWith("ZEN-20261122-")).toBe(true);
    }
    // Con 36^5 combinaciones casi todas son distintas; la base de datos garantiza la unicidad
    // y el pedido reintenta con otra si choca (ver pedido.integracion.test.ts).
    expect(new Set(referencias).size).toBeGreaterThan(9_990);
  });

  it("el token de acceso es largo y aleatorio", () => {
    const a = generarTokenAcceso();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(generarTokenAcceso()).not.toBe(a);
  });
});
