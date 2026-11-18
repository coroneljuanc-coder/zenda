import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Prueba automática de accesibilidad (ZTV-37): revisa cada página con axe contra
 * WCAG 2.1 nivel AA (requisito no funcional de ZTV-10). Corre en celular y escritorio.
 * Encuentra, entre otros: contraste insuficiente, botones o enlaces sin nombre,
 * imágenes sin texto alternativo, idioma de la página y encabezados mal ordenados.
 * No reemplaza la revisión manual con teclado (CAT-01-CP4), que se hace aparte.
 */
const NORMA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function revisar(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(NORMA).analyze();
  const resumen = resultado.violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(resumen, "Problemas de accesibilidad WCAG 2.1 AA").toEqual([]);
}

test.describe("Accesibilidad WCAG 2.1 AA (ZTV-37)", () => {
  test("página de inicio", async ({ page }) => {
    await page.goto("/");
    await revisar(page);
  });

  test("página de una categoría (ZTV-12)", async ({ page }) => {
    await page.goto("/categoria/hogar");
    await expect(page.getByRole("heading", { level: 1, name: "Hogar" })).toBeVisible();
    await revisar(page);
  });

  test("página «No encontramos esta página»", async ({ page }) => {
    await page.goto("/abc");
    await revisar(page);
  });

  test("menú de categorías abierto en celular", async ({ page, isMobile }) => {
    test.skip(!isMobile, "El menú desplegable solo existe en celular.");
    await page.goto("/");
    await page.getByRole("button", { name: "Menú" }).click();
    await expect(page.getByRole("navigation", { name: "Categorías" })).toBeVisible();
    await revisar(page);
  });

  test("«Saltar al contenido» visible al enfocarlo", async ({ page, isMobile }) => {
    test.skip(isMobile, "La navegación con teclado se prueba en escritorio.");
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeVisible();
    await revisar(page);
  });
});
