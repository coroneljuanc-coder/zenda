import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DATOS_EJEMPLO } from "./datos-ejemplo";
import { ErrorCatalogo, validarCatalogo, type DatosCatalogo } from "./validacion";

/** Copia de los datos de ejemplo para modificarla en cada prueba. */
const copia = (): DatosCatalogo => structuredClone(DATOS_EJEMPLO);

function problemasDe(datos: unknown): string[] {
  try {
    validarCatalogo(datos);
  } catch (error) {
    if (error instanceof ErrorCatalogo) return error.problemas;
    throw error;
  }
  throw new Error("Se esperaba un ErrorCatalogo y la validación pasó");
}

describe("datos de ejemplo (S0-03-CP1)", () => {
  const catalogo = validarCatalogo(DATOS_EJEMPLO);
  const activos = catalogo.productos.filter((p) => p.activo);

  it("son válidos y tienen al menos 4 categorías y 20 productos activos", () => {
    expect(catalogo.categorias.length).toBeGreaterThanOrEqual(4);
    expect(activos.length).toBeGreaterThanOrEqual(20);
  });

  it("cada producto tiene al menos una variante, una foto, precio y stock", () => {
    for (const p of catalogo.productos) {
      expect(p.variantes.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.imagenes.length, p.slug).toBeGreaterThanOrEqual(1);
      expect(p.precio, p.slug).toBeGreaterThan(0);
      for (const v of p.variantes) expect(v.stock, v.sku).toBeGreaterThanOrEqual(0);
    }
  });

  it("cada foto existe en la carpeta public/", () => {
    const publico = join(import.meta.dirname, "../../../public");
    for (const p of catalogo.productos)
      for (const img of p.imagenes) expect(existsSync(join(publico, img.url)), img.url).toBe(true);
  });

  it("incluye un producto agotado, uno inactivo y uno con variantes de precio distinto", () => {
    expect(catalogo.productos.some((p) => p.variantes.every((v) => v.stock === 0))).toBe(true);
    expect(catalogo.productos.some((p) => !p.activo)).toBe(true);
    expect(catalogo.productos.some((p) => p.variantes.some((v) => v.precio !== undefined))).toBe(
      true,
    );
  });
});

describe("validación del catálogo (S0-03-CP3 y CP4)", () => {
  it("rechaza un precio negativo indicando el producto y el campo (S0-03-CP3)", () => {
    const datos = copia();
    datos.productos[0].precio = -100;
    expect(problemasDe(datos)).toEqual([
      `Producto "camiseta-basica-algodon": precio debe ser mayor que 0`,
    ]);
  });

  it("rechaza un precio con centavos", () => {
    const datos = copia();
    datos.productos[0].precio = 49_900.5;
    expect(problemasDe(datos)[0]).toContain("precio debe ser un número entero de pesos");
  });

  it("rechaza una variante con stock negativo indicando producto y variante (S0-03-CP4)", () => {
    const datos = copia();
    datos.productos[0].variantes[1].stock = -1;
    expect(problemasDe(datos)).toEqual([
      `Producto "camiseta-basica-algodon", variante "ROP-CAM-BLA-M": stock no puede ser negativo`,
    ]);
  });

  it("rechaza un producto sin categoría", () => {
    const datos = copia();
    delete (datos.productos[1] as { categoria?: string }).categoria;
    expect(problemasDe(datos)).toEqual([
      `Producto "jean-clasico-corte-recto": categoria es obligatoria`,
    ]);
  });

  it("rechaza una categoría que no existe", () => {
    const datos = copia();
    datos.productos[1].categoria = "juguetes";
    expect(problemasDe(datos)).toEqual([
      `Producto "jean-clasico-corte-recto": categoria "juguetes" no existe en el catálogo`,
    ]);
  });

  it("rechaza un producto sin variantes", () => {
    const datos = copia();
    datos.productos[2].variantes = [];
    expect(problemasDe(datos)[0]).toContain("el producto necesita al menos una variante");
  });

  it("rechaza slugs con tildes o mayúsculas (RN4)", () => {
    const datos = copia();
    datos.categorias[2].slug = "Tecnología";
    expect(problemasDe(datos)[0]).toMatch(/^Categoría "Tecnología": slug debe ir en minúsculas/);
  });

  it("rechaza slugs y SKU repetidos", () => {
    const datos = copia();
    datos.productos[1].slug = datos.productos[0].slug;
    datos.productos[3].variantes[0].sku = "ROP-CAM-BLA-S";
    const problemas = problemasDe(datos);
    expect(problemas).toContain(
      `Producto "camiseta-basica-algodon": slug repetido (debe ser único)`,
    );
    expect(problemas).toContain(`Variante "ROP-CAM-BLA-S": sku repetido (debe ser único)`);
  });

  it("reporta todos los problemas a la vez", () => {
    const datos = copia();
    datos.productos[0].precio = 0;
    datos.productos[5].variantes[0].stock = -3;
    expect(problemasDe(datos)).toHaveLength(2);
  });
});
