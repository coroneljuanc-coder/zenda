import { expect, test } from "@playwright/test";

test.describe("Estructura común de la tienda (ZTV-10)", () => {
  test("CAT-01-CP1 · muestra encabezado con logo, carrito y pie", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Zenda");

    const encabezado = page.getByRole("banner");
    await expect(encabezado.getByRole("link", { name: "Zenda, ir al inicio" })).toBeVisible();
    await expect(encabezado.getByLabel("Carrito: 0 productos")).toBeVisible();

    const pie = page.getByRole("contentinfo");
    await expect(pie.getByText("© 2026 Zenda · Tienda de pruebas")).toBeVisible();
    await expect(pie.getByText("Tienda de pruebas: no se realizan cobros reales")).toBeVisible();

    await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();
  });

  test("CAT-01-CP5 · muestra el banner de productos de ejemplo arriba", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("note");
    await expect(banner).toHaveText("Tienda en construcción: productos de ejemplo");

    const cajaBanner = await banner.boundingBox();
    const cajaEncabezado = await page.getByRole("banner").boundingBox();
    expect(cajaBanner && cajaEncabezado && cajaBanner.y < cajaEncabezado.y).toBe(true);
  });

  test("RN2 · el logo lleva al inicio", async ({ page }) => {
    await page.goto("/?origen=prueba");
    await page.getByRole("link", { name: "Zenda, ir al inicio" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("CAT-01-CP4 · «Saltar al contenido» es lo primero al usar el teclado", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "La navegación con teclado se prueba en escritorio.");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const saltar = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(saltar).toBeFocused();
    await expect(saltar).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("#contenido")).toBeFocused();
  });

  test("no tiene desplazamiento horizontal", async ({ page }) => {
    await page.goto("/");
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde).toBeLessThanOrEqual(0);
  });
});
