import { expect, test } from "@playwright/test";

test.describe("Página «No encontramos esta página» (ZTV-36)", () => {
  test("CAT-01-CP3 · una dirección inexistente muestra el mensaje y el botón funciona", async ({
    page,
  }) => {
    const respuesta = await page.goto("/abc");
    expect(respuesta?.status()).toBe(404);
    await expect(page).toHaveTitle("Página no encontrada · Zenda");
    await expect(
      page.getByRole("heading", { level: 1, name: "No encontramos esta página" }),
    ).toBeVisible();

    // Sigue dentro de la estructura común: encabezado y pie visibles.
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    await page.getByRole("link", { name: "Volver al inicio" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Productos" })).toBeVisible();
  });

  test("CAT-03-CP4 · una categoría inexistente muestra la 404 propia", async ({ page }) => {
    const respuesta = await page.goto("/categoria/no-existe");
    expect(respuesta?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "No encontramos esta página" }),
    ).toBeVisible();
  });
});
