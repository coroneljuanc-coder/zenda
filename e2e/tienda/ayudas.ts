import { expect, type Page } from "@playwright/test";

/**
 * Agrega un producto al carrito desde su ficha, como lo haría una persona: elige talla y color,
 * sube la cantidad y toca «Agregar al carrito». Espera a que la ficha esté lista (ZTV-73).
 */
export async function agregarDesdeFicha(
  page: Page,
  slug: string,
  { talla, color, cantidad = 1 }: { talla?: string; color?: string; cantidad?: number } = {},
) {
  await page.goto(`/producto/${slug}`);
  for (const [titulo, valor] of [
    ["Talla", talla],
    ["Color", color],
  ] as const) {
    if (!valor) continue;
    const grupo = page.getByRole("group", { name: new RegExp(`^${titulo}`) });
    const radio = page.getByRole("radio", { name: valor, exact: true });
    await expect(radio).toBeEnabled();
    await grupo.locator("label").filter({ has: radio }).click();
  }
  for (let i = 1; i < cantidad; i++) {
    await page.getByRole("button", { name: "Aumentar cantidad" }).click();
  }
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.locator('[data-prueba="aviso-carrito"]')).toContainText("Agregaste");
}

/** Las líneas del carrito que se ven en pantalla. */
export const lineasCarrito = (page: Page) =>
  page.locator('[data-prueba="linea-carrito"]').filter({ visible: true });

/** Llena el formulario de compra con los datos ficticios de Ana (ZTV-19). */
export async function llenarDatosDeAna(page: Page) {
  const principal = page.getByRole("main");
  const campo = (etiqueta: string) =>
    principal.getByLabel(etiqueta, { exact: true }).filter({ visible: true });
  await expect(principal.getByRole("button", { name: "Continuar al pago" })).toBeEnabled();
  await campo("Nombre completo").fill("Ana Prueba");
  await campo("Correo electrónico").fill("ana@ejemplo.com");
  await campo("Celular").fill("3001234567");
  await campo("Departamento").selectOption({ label: "Antioquia" });
  await campo("Ciudad o municipio").selectOption({ label: "Medellín" });
  await campo("Dirección").fill("Cra 1 # 2-3");
  await principal
    .getByRole("checkbox", { name: /Autorizo el tratamiento de mis datos personales/ })
    .check();
}

/** 3 × Camiseta M / Negro hasta el resumen final ($ 161.700). */
export async function irAlResumen(page: Page) {
  await agregarDesdeFicha(page, "camiseta-basica-algodon", {
    talla: "M",
    color: "Negro",
    cantidad: 3,
  });
  await page.goto("/compra");
  await llenarDatosDeAna(page);
  await page.getByRole("main").getByRole("button", { name: "Continuar al pago" }).click();
  await expect(page).toHaveURL(/\/compra\/resumen$/);
}
