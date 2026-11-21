import { expect, test, type Locator, type Page } from "@playwright/test";

// Datos de ejemplo (datos-ejemplo.ts): camiseta M / Negro con stock 15 y chaqueta L con stock 3.
// Cada prueba abre un navegador nuevo, así que empieza con el carrito vacío.

const grupo = (page: Page, titulo: "Talla" | "Color") =>
  page.getByRole("group", { name: new RegExp(`^${titulo}`) });

/**
 * Toca la opción como lo haría una persona, sobre su etiqueta. Primero espera a que la ficha esté
 * lista: mientras carga, las opciones están deshabilitadas (ZTV-73) y un toque no haría nada.
 */
const elegir = async (grupoOpciones: Locator, nombre: string) => {
  const radio = grupoOpciones.getByRole("radio", { name: nombre, exact: true });
  await expect(radio).toBeEnabled();
  // `has` busca dentro de cada etiqueta: el radio se describe desde la página, no desde el grupo.
  const radioEnEtiqueta = grupoOpciones.page().getByRole("radio", { name: nombre, exact: true });
  await grupoOpciones.locator("label").filter({ has: radioEnEtiqueta }).click();
};

const enlaceCarrito = (page: Page) => page.getByRole("banner").locator('[data-prueba="carrito"]');

test.describe("Agregar al carrito (ZTV-16)", () => {
  test("CAR-01-CP1 · 2 camisetas M / Negro: aviso con botones y contador en 2", async ({
    page,
  }) => {
    await page.goto("/producto/camiseta-basica-algodon");
    await expect(enlaceCarrito(page)).toHaveAccessibleName("Carrito: 0 productos");

    await elegir(grupo(page, "Talla"), "M");
    await elegir(grupo(page, "Color"), "Negro");
    await page.getByRole("button", { name: "Aumentar cantidad" }).click();
    await expect(page.locator('[data-prueba="cantidad"]')).toHaveText("2");
    await page.getByRole("button", { name: "Agregar al carrito" }).click();

    const aviso = page.locator('[data-prueba="aviso-carrito"]');
    await expect(aviso).toContainText("Agregaste 2 × Camiseta básica de algodón al carrito");
    await expect(aviso.getByRole("link", { name: "Ver carrito" })).toHaveAttribute(
      "href",
      "/carrito",
    );
    await expect(enlaceCarrito(page)).toHaveAccessibleName("Carrito: 2 productos");
    await expect(enlaceCarrito(page).locator('[data-prueba="carrito-unidades"]')).toHaveText("2");

    await aviso.getByRole("button", { name: "Seguir comprando" }).click();
    await expect(aviso).toBeEmpty();
  });

  test("CAR-01-CP5 · el carrito se conserva al cerrar y volver a abrir el navegador", async ({
    page,
    browser,
  }) => {
    await page.goto("/producto/cargador-rapido-usb-c-30w");
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(enlaceCarrito(page)).toHaveAccessibleName("Carrito: 1 producto");

    // Otro navegador con las mismas cookies guardadas, como al volver otro día.
    const guardado = await page.context().storageState();
    const otro = await browser.newContext({ storageState: guardado });
    const pagina = await otro.newPage();
    await pagina.goto("/");
    await expect(enlaceCarrito(pagina)).toHaveAccessibleName("Carrito: 1 producto");
    await otro.close();
  });

  test("escenario 3 · no deja pasar del stock y lo explica", async ({ page }) => {
    await page.goto("/producto/chaqueta-impermeable-liviana");
    await elegir(grupo(page, "Talla"), "L");
    const aumentar = page.getByRole("button", { name: "Aumentar cantidad" });
    await aumentar.click();
    await aumentar.click();
    await expect(page.locator('[data-prueba="cantidad"]')).toHaveText("3");
    await expect(aumentar).toBeDisabled(); // RN1: no se elige más que el stock

    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(enlaceCarrito(page)).toHaveAccessibleName("Carrito: 3 productos");

    await page.getByRole("button", { name: "Disminuir cantidad" }).click();
    await page.getByRole("button", { name: "Disminuir cantidad" }).click();
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    // Dentro del contenido: Next.js tiene su propio anunciador oculto con el rol «alert».
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Solo hay 3 unidades disponibles. Ya tienes 3 en tu carrito.",
    );
    await expect(enlaceCarrito(page)).toHaveAccessibleName("Carrito: 3 productos");
  });

  test("responsive · en celular el botón queda fijo abajo de la pantalla", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "La barra fija es del celular.");
    await page.goto("/producto/cargador-rapido-usb-c-30w");
    const boton = page.getByRole("button", { name: "Agregar al carrito" });
    await expect(boton).toBeEnabled(); // la ficha ya terminó de armarse
    const alto = page.viewportSize()?.height ?? 0;
    // El borde inferior del botón queda pegado al final de la pantalla (barra fija).
    await expect
      .poll(async () => {
        const caja = await boton.boundingBox();
        return caja ? caja.y + caja.height : 0;
      })
      .toBeGreaterThan(alto - 40);
  });
});
