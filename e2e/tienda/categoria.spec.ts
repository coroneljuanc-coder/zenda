import { expect, test, type Page } from "@playwright/test";

// Datos de ejemplo: «Hogar» tiene 4 productos activos.
// Solo las visibles: Next.js deja la página anterior oculta en el documento para volver rápido.
const tarjetas = (page: Page) =>
  page.locator('[data-prueba="tarjeta-producto"]').filter({ visible: true });

async function entrarAHogarDesdeElMenu(page: Page, isMobile: boolean) {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Menú" }).click();
  await page
    .getByRole("navigation", { name: "Categorías" })
    .getByRole("link", { name: "Hogar" })
    .click();
  await expect(page).toHaveURL(/\/categoria\/hogar$/, { timeout: 20_000 });
}

test.describe("Productos por categoría (ZTV-12)", () => {
  test("CAT-03-CP1 · «Hogar» muestra solo sus 4 productos, título, descripción y ruta", async ({
    page,
    isMobile,
  }) => {
    await entrarAHogarDesdeElMenu(page, isMobile);

    await expect(page).toHaveTitle("Hogar · Zenda");
    await expect(page.getByRole("heading", { level: 1, name: "Hogar" })).toBeVisible();
    await expect(page.getByText("Cocina, descanso y decoración.")).toBeVisible();

    const ruta = page.getByRole("navigation", { name: "Ruta de navegación" });
    await expect(ruta).toHaveText(/Inicio\s*›\s*Hogar/);
    await expect(ruta.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");

    await expect(tarjetas(page)).toHaveCount(4);
    await expect(tarjetas(page).filter({ hasText: "Camiseta" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Paginación" })).toHaveCount(0);
  });

  test("RN2 · la categoría activa se resalta en el menú", async ({ page, isMobile }) => {
    await page.goto("/categoria/hogar");
    if (isMobile) await page.getByRole("button", { name: "Menú" }).click();
    const menu = page.getByRole("navigation", { name: "Categorías" });

    await expect(menu.getByRole("link", { name: "Hogar" })).toHaveAttribute("aria-current", "page");
    await expect(menu.locator('[aria-current="page"]')).toHaveCount(1);
  });

  test("RN3 · cada categoría del menú abre su propia dirección", async ({ page }) => {
    for (const [slug, nombre] of [
      ["ropa", "Ropa"],
      ["tecnologia", "Tecnología"],
      ["belleza-y-cuidado", "Belleza y cuidado"],
    ]) {
      const respuesta = await page.goto(`/categoria/${slug}`);
      expect(respuesta?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
      // El listado llega un instante después del título: se espera a que aparezca.
      await expect(tarjetas(page).first()).toBeVisible();
    }
  });
});
