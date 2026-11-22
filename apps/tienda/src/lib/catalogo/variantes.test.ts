import { describe, expect, it } from "vitest";
import {
  evaluarSeleccion,
  opcionDisponible,
  opcionesDe,
  ordenarTallas,
  seleccionInicial,
  textoFalta,
  type VarianteFicha,
} from "./variantes";

// Datos como los de la camiseta y la chaqueta de ejemplo (datos-ejemplo.ts).
const v = (
  sku: string,
  talla: string | null,
  color: string | null,
  stock: number,
  precio = 49_900,
) => ({ id: sku, sku, talla, color, stock, precio }) satisfies VarianteFicha;

const camiseta = [
  v("ROP-CAM-BLA-S", "S", "Blanco", 12),
  v("ROP-CAM-BLA-M", "M", "Blanco", 20),
  v("ROP-CAM-NEG-M", "M", "Negro", 15),
  v("ROP-CAM-NEG-L", "L", "Negro", 6),
];
const chaqueta = [
  v("ROP-CHA-S", "S", "Verde oliva", 0, 189_900),
  v("ROP-CHA-M", "M", "Verde oliva", 7, 189_900),
  v("ROP-CHA-L", "L", "Verde oliva", 3, 189_900),
];
const cargador = [v("TEC-CAR-30W", null, null, 30, 69_900)];
const botella = [
  v("DEP-BOT-750", "750 ml", null, 10, 59_900),
  v("DEP-BOT-500", "500 ml", null, 12, 49_900),
];

describe("ordenarTallas (RN3)", () => {
  it("CAT-06-CP5 · tallas de letra en orden lógico, no alfabético", () => {
    expect(ordenarTallas(["L", "XS", "M"])).toEqual(["XS", "M", "L"]);
  });

  it("CAT-06-CP5 · tallas numéricas de menor a mayor", () => {
    expect(ordenarTallas(["34", "28", "30"])).toEqual(["28", "30", "34"]);
    expect(ordenarTallas(["750 ml", "500 ml"])).toEqual(["500 ml", "750 ml"]);
  });

  it("quita repetidas y deja al final las que no conoce", () => {
    expect(ordenarTallas(["Única", "M", "S", "M"])).toEqual(["S", "M", "Única"]);
  });
});

describe("opcionesDe", () => {
  it("tallas ordenadas y colores en el orden en que aparecen", () => {
    expect(opcionesDe(camiseta)).toEqual({ tallas: ["S", "M", "L"], colores: ["Blanco", "Negro"] });
  });

  it("un producto sin talla ni color no tiene opciones (escenario 4)", () => {
    expect(opcionesDe(cargador)).toEqual({ tallas: [], colores: [] });
  });
});

describe("seleccionInicial", () => {
  it("toma la variante de la dirección (?variante=sku)", () => {
    expect(seleccionInicial(camiseta, "ROP-CAM-NEG-M")).toEqual({ talla: "M", color: "Negro" });
  });

  it("ignora un sku que no es de este producto", () => {
    expect(seleccionInicial(camiseta, "TEC-CAR-30W")).toEqual({ talla: null, color: null });
  });

  it("deja elegido lo que tiene una sola opción (el único color de la chaqueta)", () => {
    expect(seleccionInicial(chaqueta)).toEqual({ talla: null, color: "Verde oliva" });
  });
});

describe("evaluarSeleccion", () => {
  it("escenario 1 · M / Negro está lista, con su precio", () => {
    const estado = evaluarSeleccion(camiseta, { talla: "M", color: "Negro" });
    expect(estado).toMatchObject({ tipo: "lista", variante: { sku: "ROP-CAM-NEG-M" } });
  });

  it("escenario 3 · sin elegir faltan talla y color", () => {
    expect(evaluarSeleccion(camiseta, { talla: null, color: null })).toEqual({
      tipo: "incompleta",
      faltan: ["talla", "color"],
    });
    expect(textoFalta("talla")).toBe("Selecciona una talla");
    expect(textoFalta("color")).toBe("Selecciona un color");
  });

  it("escenario 2 · una combinación con stock 0 está agotada", () => {
    expect(evaluarSeleccion(chaqueta, { talla: "S", color: "Verde oliva" })).toMatchObject({
      tipo: "agotada",
      variante: { sku: "ROP-CHA-S" },
    });
  });

  it("escenario 2 · una combinación que no existe (L / Blanco) también está agotada", () => {
    expect(evaluarSeleccion(camiseta, { talla: "L", color: "Blanco" })).toEqual({
      tipo: "agotada",
      variante: null,
    });
  });

  it("escenario 4 · la variante única queda lista sin elegir nada", () => {
    const estado = evaluarSeleccion(cargador, seleccionInicial(cargador));
    expect(estado).toMatchObject({ tipo: "lista", variante: { sku: "TEC-CAR-30W" } });
  });

  it("RN1 · cada variante conserva su propio precio", () => {
    const estado = evaluarSeleccion(botella, { talla: "500 ml", color: null });
    expect(estado).toMatchObject({ tipo: "lista", variante: { precio: 49_900 } });
  });
});

describe("opcionDisponible (escenario 2)", () => {
  it("con L elegida, Blanco aparece tachado y Negro no", () => {
    const seleccion = { talla: "L", color: null };
    expect(opcionDisponible(camiseta, "color", "Blanco", seleccion)).toBe(false);
    expect(opcionDisponible(camiseta, "color", "Negro", seleccion)).toBe(true);
  });

  it("la talla S de la chaqueta (stock 0) aparece tachada", () => {
    const seleccion = { talla: null, color: "Verde oliva" };
    expect(opcionDisponible(chaqueta, "talla", "S", seleccion)).toBe(false);
    expect(opcionDisponible(chaqueta, "talla", "M", seleccion)).toBe(true);
  });

  it("sin nada elegido, una opción está disponible si alguna variante con stock la tiene", () => {
    expect(opcionDisponible(camiseta, "talla", "S", { talla: null, color: null })).toBe(true);
  });
});
