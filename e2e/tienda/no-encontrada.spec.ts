import { expect, test } from "@playwright/test";

test.describe("Página «No encontramos esta página» (ZTV-36)", () => {
  test("CAT-01-CP3 · una dirección inexistente muestra el mensaje y el botón funciona", async ({
    page,
  }) => {
    const respuesta = await page.goto("/abc");
    expect(respuesta?.status()).toBe(404);
    await expect(page).toHaveTitle("Página no encontrada | Zenda");
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
    // Dirección distinta en cada ejecución: así se prueba siempre la «primera visita».
    const respuesta = await page.goto(`/categoria/no-existe-${Date.now()}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "No encontramos esta página" }),
    ).toBeVisible();

    // En la primera visita a una ruta no generada, Next.js 16 ya envió el esqueleto con estado
    // 200; en ese caso la página debe quedar marcada para que los buscadores no la indexen.
    if (respuesta?.status() !== 404) {
      expect(respuesta?.status()).toBe(200);
      await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
    }
  });
});
