import { describe, expect, it } from "vitest";
import { formatearCOP } from "./formato";

describe("formatearCOP", () => {
  it("da formato de pesos con punto de miles (S0-02-CP1)", () => {
    expect(formatearCOP(89900)).toBe("$ 89.900");
  });

  it("da formato a valores de millones (CAT-02-CP2)", () => {
    expect(formatearCOP(1250000)).toBe("$ 1.250.000");
  });

  it("no muestra decimales", () => {
    expect(formatearCOP(1000)).toBe("$ 1.000");
    expect(formatearCOP(0)).toBe("$ 0");
  });

  it("usa un espacio normal después del símbolo", () => {
    expect(formatearCOP(5000)).not.toContain(" ");
  });

  it("rechaza valores que no son enteros", () => {
    expect(() => formatearCOP(89900.5)).toThrow(RangeError);
    expect(() => formatearCOP(Number.NaN)).toThrow(RangeError);
  });
});
