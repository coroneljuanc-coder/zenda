import { describe, expect, it } from "vitest";
import { normalizar, textoResultados, validarBusqueda } from "./busqueda";

describe("búsqueda de productos (ZTV-14)", () => {
  it("CAT-05-CP4 · RN3 · rechaza «a», «  a » y 61 caracteres; acepta de 2 a 60 sin espacios de borde", () => {
    expect(validarBusqueda("a")).toEqual({ ok: false, mensaje: "Escribe al menos 2 caracteres" });
    expect(validarBusqueda("  a ")).toEqual({
      ok: false,
      mensaje: "Escribe al menos 2 caracteres",
    });
    expect(validarBusqueda("x".repeat(61)).ok).toBe(false);
    expect(validarBusqueda(undefined).ok).toBe(false);
    expect(validarBusqueda("  camiseta  ")).toEqual({ ok: true, texto: "camiseta" });
    expect(validarBusqueda("x".repeat(60)).ok).toBe(true);
  });

  it("RN2 · normaliza mayúsculas y tildes", () => {
    expect(normalizar("LÁMPARA")).toBe("lampara");
    expect(normalizar("Champú sólido")).toBe("champu solido");
    expect(normalizar("Año")).toBe("ano");
  });

  it("mensajes de resultados en singular, plural y sin resultados", () => {
    expect(textoResultados(3, "camiseta")).toBe("3 resultados para «camiseta»");
    expect(textoResultados(1, "lampara")).toBe("1 resultado para «lampara»");
    expect(textoResultados(0, "xyz123")).toBe(
      "No encontramos productos para «xyz123». Revisa la ortografía o explora nuestras categorías.",
    );
  });
});
