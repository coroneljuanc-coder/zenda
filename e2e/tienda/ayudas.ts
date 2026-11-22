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
