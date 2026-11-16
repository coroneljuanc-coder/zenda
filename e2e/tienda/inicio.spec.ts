import { expect, test } from "@playwright/test";

test.describe("Página de inicio de la tienda (S0-02-CP2)", () => {
  test("muestra «Zenda – Próximamente»", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Zenda – Próximamente");
    await expect(
      page.getByRole("heading", { level: 1, name: "Zenda – Próximamente" }),
    ).toBeVisible();
  });

  test("no tiene desplazamiento horizontal", async ({ page }) => {
    await page.goto("/");
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde).toBeLessThanOrEqual(0);
  });
});
