import { expect, test, type Page } from "@playwright/test";

/** El buscador visible: en celular se abre con la lupa (ZTV-14). */
async function buscar(page: Page, texto: string) {
  const abrir = page.getByRole("button", { name: "Abrir el buscador" });
  if (await abrir.isVisible()) await abrir.click();
  const campo = page.getByRole("searchbox", { name: "Buscar productos" }).filter({ visible: true });
  await campo.fill(texto);
  await campo.press("Enter");
}

test.describe("Búsqueda (ZTV-14)", () => {
  test("CAT-05-CP1 · «camiseta» lleva a /buscar?q=camiseta con el contador y los productos", async ({
    page,
  }) => {
    await page.goto("/");
    await buscar(page, "camiseta");
    await expect(page).toHaveURL(/\/buscar\?q=camiseta$/);
    const contador = page.locator('[data-prueba="resultados-busqueda"]');
    // Seed (A8): un solo producto con «camiseta» en el nombre o la descripción.
    await expect(contador).toHaveText("1 resultado para «camiseta»");
    await expect(
      page.getByRole("link", { name: /Camiseta básica de algodón/ }).first(),
    ).toBeVisible();
  });

  test("CAT-05-CP3 · «xyz123» muestra el mensaje de sin resultados y las categorías", async ({
    page,
  }) => {
    await page.goto("/buscar?q=xyz123");
    await expect(page.locator('[data-prueba="resultados-busqueda"]')).toHaveText(
      "No encontramos productos para «xyz123». Revisa la ortografía o explora nuestras categorías.",
    );
    await expect(page.getByRole("main").getByRole("link", { name: "Hogar" })).toBeVisible();
  });

  test("CAT-05-CP4 · una sola letra no busca y avisa «Escribe al menos 2 caracteres»", async ({
    page,
  }) => {
    await page.goto("/");
    await buscar(page, "a");
    await expect(
      page.getByText("Escribe al menos 2 caracteres").filter({ visible: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});
