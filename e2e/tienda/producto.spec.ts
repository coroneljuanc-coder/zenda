import { expect, test } from "@playwright/test";

// Datos de ejemplo usados: la lámpara (17 unidades, $ 89.900, Hogar), el teclado (agotado),
// la botella (precios distintos) y la gorra (inactiva). Ningún producto activo de ejemplo
// tiene entre 1 y 5 unidades: «¡Últimas N unidades!» se prueba en las unitarias (CAT-04-CP2/CP3).
const noEncontrada = /No encontramos esta página/;

test.describe("Ficha de producto (ZTV-13)", () => {
  test("CAT-04-CP1 · desde el listado se abre la ficha completa con «Disponible»", async ({
    page,
  }) => {
    await page.goto("/categoria/hogar");
    await page
      .locator('[data-prueba="tarjeta-producto"]')
      .filter({ visible: true, hasText: "Lámpara de escritorio LED" })
      .click();
    await expect(page).toHaveURL(/\/producto\/lampara-escritorio-led$/, { timeout: 20_000 });

    await expect(page).toHaveTitle("Lámpara de escritorio LED · Zenda");
    await expect(
      page.getByRole("heading", { level: 1, name: "Lámpara de escritorio LED" }),
    ).toBeVisible();
    await expect(
      page.getByText("$ 89.900", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(page.locator('[data-prueba="disponibilidad"]')).toHaveText("Disponible");
    await expect(
      page.getByText("Lámpara con brazo flexible, tres tonos de luz y puerto USB."),
    ).toBeVisible();

    const ruta = page.getByRole("navigation", { name: "Ruta de navegación" });
    await expect(ruta).toHaveText(/Inicio\s*›\s*Hogar\s*›\s*Lámpara de escritorio LED/);
    await expect(ruta.getByRole("link", { name: "Hogar" })).toHaveAttribute(
      "href",
      "/categoria/hogar",
    );

    await expect(
      page.getByRole("img", { name: /Lámpara de escritorio LED/ }).first(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeDisabled();
    await expect(page.getByText("Próximamente")).toBeVisible();
  });

  test("escenario 3 · un producto agotado muestra «Agotado» y no deja comprar", async ({
    page,
  }) => {
    await page.goto("/producto/teclado-mecanico-compacto");
    await expect(page.locator('[data-prueba="disponibilidad"]')).toHaveText("Agotado");
    await expect(page.getByText("Este producto no está disponible por ahora")).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar al carrito" })).toHaveCount(0);
  });

  test("RN4 · variantes con precios distintos muestran «Desde»", async ({ page }) => {
    await page.goto("/producto/botella-termica-acero");
    await expect(page.getByText("Desde $ 49.900", { exact: true })).toBeVisible();
  });

  test("CAT-04-CP5 · RN3 · un producto inactivo muestra la página 404", async ({ page }) => {
    await page.goto("/producto/gorra-edicion-limitada");
    await expect(page.getByRole("heading", { level: 1, name: noEncontrada })).toBeVisible();
  });

  test("escenario 4 · un producto inexistente muestra la página 404", async ({ page }) => {
    const respuesta = await page.goto(`/producto/no-existe-${Date.now()}`);
    await expect(page.getByRole("heading", { level: 1, name: noEncontrada })).toBeVisible();
    if (respuesta?.status() !== 404) {
      expect(respuesta?.status()).toBe(200);
      await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
    }
  });

  test("SEO · vista previa para redes con la primera foto", async ({ page }) => {
    await page.goto("/producto/lampara-escritorio-led");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/productos\/lampara-escritorio-led\.svg$/,
    );
  });

  test("CAT-04-CP6 · en celular la galería se desliza de lado", async ({ page, isMobile }) => {
    test.skip(!isMobile, "El carrusel deslizable es la vista de celular.");
    await page.goto("/producto/lampara-escritorio-led");
    const galeria = page.locator('[data-prueba="galeria-celular"]');
    await expect(galeria).toBeVisible();
    const estilo = await galeria.evaluate((el) => {
      const css = getComputedStyle(el);
      return { desplazamiento: css.overflowX, ajuste: css.scrollSnapType };
    });
    expect(estilo.desplazamiento).toBe("auto");
    expect(estilo.ajuste).toContain("x");
  });
});
