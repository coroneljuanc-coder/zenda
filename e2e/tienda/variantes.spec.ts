import { expect, test, type Locator, type Page } from "@playwright/test";

// Datos de ejemplo usados (datos-ejemplo.ts): camiseta ($ 49.900; S/Blanco 12, M/Blanco 20,
// M/Negro 15, L/Negro 6; no existen S/Negro ni L/Blanco), chaqueta (Verde oliva; S agotada),
// botella (500 ml a $ 49.900 y 750 ml a $ 59.900) y cargador (variante única).

const grupo = (page: Page, titulo: "Talla" | "Color") =>
  page.getByRole("group", { name: new RegExp(`^${titulo}`) });

/** Toca la opción como lo haría una persona: sobre su etiqueta, no sobre el radio oculto. */
const elegir = (grupoOpciones: Locator, nombre: string) =>
  grupoOpciones
    .locator("label")
    .filter({ has: grupoOpciones.page().getByRole("radio", { name: nombre, exact: true }) })
    .click();

const visible = (page: Page, prueba: string) =>
  page.locator(`[data-prueba="${prueba}"]`).filter({ visible: true });

test.describe("Talla y color en la ficha (ZTV-15)", () => {
  test("CAT-06-CP1 · M / Negro muestra su precio y disponibilidad y queda en la dirección", async ({
    page,
  }) => {
    await page.goto("/producto/camiseta-basica-algodon");
    await elegir(grupo(page, "Talla"), "M");
    await elegir(grupo(page, "Color"), "Negro");

    await expect(grupo(page, "Talla").getByRole("radio", { name: "M" })).toBeChecked();
    await expect(grupo(page, "Color").getByRole("radio", { name: "Negro" })).toBeChecked();
    await expect(visible(page, "precio")).toHaveText("$ 49.900");
    await expect(visible(page, "disponibilidad")).toHaveText("Disponible");
    await expect(page).toHaveURL(/\?variante=ROP-CAM-NEG-M$/);
  });

  test("un enlace con ?variante= abre con esa talla y ese color elegidos", async ({ page }) => {
    await page.goto("/producto/camiseta-basica-algodon?variante=ROP-CAM-NEG-L");
    await expect(grupo(page, "Talla").getByRole("radio", { name: "L" })).toBeChecked();
    await expect(grupo(page, "Color").getByRole("radio", { name: "Negro" })).toBeChecked();
  });

  test("CAT-06-CP2 · una talla agotada aparece tachada y avisa al elegirla", async ({ page }) => {
    await page.goto("/producto/chaqueta-impermeable-liviana");
    // El único color de la chaqueta ya viene elegido; la talla S (stock 0) se anuncia «agotada».
    await expect(grupo(page, "Color").getByRole("radio", { name: "Verde oliva" })).toBeChecked();
    await elegir(grupo(page, "Talla"), "S (agotada)");

    await expect(page.getByText("Esta combinación está agotada")).toBeVisible();
    await expect(visible(page, "disponibilidad")).toHaveText("Agotado");
    await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeDisabled();
  });

  test("CAT-06-CP2 · con L elegida, el color Blanco (que no existe en L) aparece agotado", async ({
    page,
  }) => {
    await page.goto("/producto/camiseta-basica-algodon");
    await elegir(grupo(page, "Talla"), "L");
    await elegir(grupo(page, "Color"), "Blanco (agotada)");
    await expect(page.getByText("Esta combinación está agotada")).toBeVisible();
  });

  test("CAT-06-CP3 · sin elegir, «Agregar al carrito» pide talla y color", async ({ page }) => {
    await page.goto("/producto/camiseta-basica-algodon");
    await page.getByRole("button", { name: "Agregar al carrito" }).click();

    await expect(grupo(page, "Talla").getByRole("alert")).toHaveText("Selecciona una talla");
    await expect(grupo(page, "Color").getByRole("alert")).toHaveText("Selecciona un color");
    await expect(grupo(page, "Talla").getByRole("radio").first()).toBeFocused();
    await expect(page).not.toHaveURL(/variante=/);
  });

  test("CAT-06-CP4 · un producto de variante única no muestra selectores", async ({ page }) => {
    await page.goto("/producto/cargador-rapido-usb-c-30w");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(grupo(page, "Talla")).toHaveCount(0);
    await expect(grupo(page, "Color")).toHaveCount(0);
    await expect(visible(page, "disponibilidad")).toHaveText("Disponible");
    await expect(page.getByRole("button", { name: "Agregar al carrito" })).toBeEnabled();
  });

  test("RN1 · cada tamaño de la botella muestra su propio precio", async ({ page }) => {
    await page.goto("/producto/botella-termica-acero");
    await expect(visible(page, "precio")).toHaveText("Desde $ 49.900");
    await elegir(grupo(page, "Talla"), "750 ml");
    await expect(visible(page, "precio")).toHaveText("$ 59.900");
    await elegir(grupo(page, "Talla"), "500 ml");
    await expect(visible(page, "precio")).toHaveText("$ 49.900");
  });

  test("responsive · las opciones miden al menos 44 × 44 px en celular", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "El tamaño mínimo para el dedo se revisa en celular.");
    await page.goto("/producto/camiseta-basica-algodon");
    const opcion = grupo(page, "Talla").locator("label span").first();
    await expect(opcion).toBeVisible(); // medir antes de que se dibuje devuelve «sin caja»
    const caja = await opcion.boundingBox();
    expect(caja?.width).toBeGreaterThanOrEqual(44);
    expect(caja?.height).toBeGreaterThanOrEqual(44);
  });
});
