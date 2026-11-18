import { expect, test, type Page } from "@playwright/test";

// Datos de ejemplo: 21 productos cargados, 20 activos (la gorra está inactiva).
// El orden exacto (más reciente primero) se prueba en la integración, con fechas controladas:
// aquí depende de cuándo se cargó cada producto de ejemplo en la base de esa ejecución.
const tarjetas = (page: Page) => page.locator('[data-prueba="tarjeta-producto"]');

test.describe("Listado de productos (ZTV-11)", () => {
  test("CAT-02-CP1 · la página de inicio muestra 12 productos con foto, nombre y precio", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Productos" })).toBeVisible();
    await expect(tarjetas(page)).toHaveCount(12);

    const primera = tarjetas(page).first();
    await expect(primera.getByRole("img")).toHaveAttribute("alt", /^Foto de ejemplo: /);
    await expect(primera.locator("p").nth(1)).toHaveText(/^(Desde )?\$ \d{1,3}(\.\d{3})*$/);
    await expect(primera).toHaveAttribute("href", /^\/producto\/[a-z0-9-]+$/);
  });

  test("CAT-02-CP3 · «Siguiente» lleva a ?pagina=2 con los 8 productos restantes", async ({
    page,
  }) => {
    await page.goto("/");
    const paginacion = page.getByRole("navigation", { name: "Paginación" });
    await expect(paginacion).toContainText("Página 1 de 2");
    const primeraPagina = await tarjetas(page).allTextContents();

    await paginacion.getByRole("link", { name: "Siguiente" }).click();
    await expect(page).toHaveURL(/\?pagina=2$/, { timeout: 20_000 });
    await expect(tarjetas(page)).toHaveCount(8);
    await expect(paginacion).toContainText("Página 2 de 2");

    const segundaPagina = await tarjetas(page).allTextContents();
    expect(new Set([...primeraPagina, ...segundaPagina]).size).toBe(20);

    await paginacion.getByRole("link", { name: "Anterior" }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
    await expect(tarjetas(page)).toHaveCount(12);
  });

  test("RN1, RN3 y escenario 3 · inactivo oculto, «Desde» y «Agotado»", async ({ page }) => {
    const textos: string[] = [];
    for (const ruta of ["/", "/?pagina=2"]) {
      await page.goto(ruta);
      textos.push(...(await tarjetas(page).allTextContents()));
    }

    expect(textos.some((t) => t.includes("Gorra edición limitada"))).toBe(false);
    expect(textos.find((t) => t.includes("Botella térmica de acero"))).toContain("Desde $ 49.900");

    await page.goto(
      textos.findIndex((t) => t.includes("Teclado mecánico")) < 12 ? "/" : "/?pagina=2",
    );
    const teclado = tarjetas(page).filter({ hasText: "Teclado mecánico compacto" });
    await expect(teclado.getByText("Agotado", { exact: true })).toBeVisible();
    await expect(teclado.getByRole("img")).toHaveClass(/opacity-50/);
  });

  test("RN5 · una página que no existe muestra la última válida", async ({ page }) => {
    await page.goto("/?pagina=99");
    await expect(page.getByRole("navigation", { name: "Paginación" })).toContainText(
      "Página 2 de 2",
    );
    await expect(tarjetas(page)).toHaveCount(8);
  });

  test("responsive · 2 columnas en celular y 4 en escritorio", async ({ page, isMobile }) => {
    await page.goto("/");
    const columnas = await page
      .locator("main ul")
      .first()
      .evaluate((ul) => getComputedStyle(ul).gridTemplateColumns.split(" ").length);
    expect(columnas).toBe(isMobile ? 2 : 4);
  });
});
