import { expect, test, type Page } from "@playwright/test";
import { agregarDesdeFicha, lineasCarrito } from "./ayudas";

// Datos de ejemplo (datos-ejemplo.ts): camiseta $ 49.900 (M / Negro, stock 15) y chaqueta
// $ 189.900 (L, stock 3). Cada prueba abre un navegador nuevo: empieza con el carrito vacío.
const CAMISETA = "Camiseta básica de algodón";

const contador = (page: Page) => page.locator('[data-prueba="carrito"]').filter({ visible: true });
const cantidadDe = (page: Page) =>
  page.locator('[data-prueba="cantidad-linea"]').filter({ visible: true });
const boton = (page: Page, nombre: string) =>
  page.getByRole("button", { name: nombre }).filter({ visible: true });

/** Deja 2 camisetas M / Negro en el carrito y abre /carrito con los controles listos. */
async function carritoConDosCamisetas(page: Page) {
  await agregarDesdeFicha(page, "camiseta-basica-algodon", {
    talla: "M",
    color: "Negro",
    cantidad: 2,
  });
  await page.goto("/carrito");
  await expect(cantidadDe(page)).toHaveText("2");
  await expect(boton(page, `Aumentar cantidad de ${CAMISETA}`)).toBeEnabled();
}

test.describe("Cambiar cantidades y eliminar (ZTV-18)", () => {
  test("CAR-03-CP1 · «+» sube a 3 y actualiza totales y contador sin recargar", async ({
    page,
  }) => {
    await carritoConDosCamisetas(page);
    await boton(page, `Aumentar cantidad de ${CAMISETA}`).click();

    await expect(cantidadDe(page)).toHaveText("3");
    await expect(lineasCarrito(page).locator('[data-prueba="total-linea"]')).toHaveText(
      "$ 149.700",
    );
    await expect(page.locator('[data-prueba="subtotal"]')).toHaveText("$ 149.700");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tu carrito (3 productos)");
    await expect(contador(page)).toHaveAccessibleName("Carrito: 3 productos");
  });

  test("CAR-03-CP3 · «−» se deshabilita en 1", async ({ page }) => {
    await carritoConDosCamisetas(page);
    const menos = boton(page, `Disminuir cantidad de ${CAMISETA}`);
    await menos.click();
    await expect(cantidadDe(page)).toHaveText("1");
    await expect(menos).toBeDisabled();
    await expect(page.locator('[data-prueba="subtotal"]')).toHaveText("$ 49.900");
  });

  test("CAR-03-CP5 · cinco toques rápidos en «+» desde 2 terminan en 7, también en la BD", async ({
    page,
  }) => {
    await carritoConDosCamisetas(page);
    const mas = boton(page, `Aumentar cantidad de ${CAMISETA}`);
    for (let i = 0; i < 5; i++) await mas.click();

    await expect(cantidadDe(page)).toHaveText("7");
    // El subtotal llega cuando el servidor termina los cinco cambios, que van en fila: con la
    // suite completa en paralelo puede tardar más de los 5 s de espera normales.
    await expect(page.locator('[data-prueba="subtotal"]')).toHaveText("$ 349.300", {
      timeout: 15_000,
    });
    // Lo guardado en la base de datos: al recargar sigue en 7.
    await page.reload();
    await expect(cantidadDe(page)).toHaveText("7");
    await expect(contador(page)).toHaveAccessibleName("Carrito: 7 productos");
  });

  test("escenario 4 · en el máximo de stock «+» avisa que no hay más unidades", async ({
    page,
  }) => {
    await agregarDesdeFicha(page, "chaqueta-impermeable-liviana", { talla: "L", cantidad: 3 });
    await page.goto("/carrito");
    await expect(cantidadDe(page)).toHaveText("3");
    await boton(page, "Aumentar cantidad de Chaqueta impermeable liviana").click();

    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "No hay más unidades disponibles",
    );
    await expect(cantidadDe(page)).toHaveText("3");
  });

  test("CAR-03-CP2 · «Eliminar» y luego «Deshacer» devuelve la línea con su cantidad", async ({
    page,
  }) => {
    await carritoConDosCamisetas(page);
    await boton(page, `Eliminar ${CAMISETA} del carrito`).click();

    const aviso = page.locator('[data-prueba="aviso-eliminado"]');
    await expect(aviso).toContainText(`Eliminaste ${CAMISETA} del carrito`);
    // Era la única línea: el carrito queda vacío, pero el aviso sigue (RN3).
    await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
    await expect(contador(page)).toHaveAccessibleName("Carrito: 0 productos");

    await aviso.getByRole("button", { name: "Deshacer" }).click();
    await expect(cantidadDe(page)).toHaveText("2");
    await expect(lineasCarrito(page)).toHaveCount(1);
    await expect(contador(page)).toHaveAccessibleName("Carrito: 2 productos");
    await expect(aviso).toBeEmpty();
  });

  test("RN2 · «Deshacer» desaparece a los 5 segundos", async ({ page }) => {
    await carritoConDosCamisetas(page);
    await boton(page, `Eliminar ${CAMISETA} del carrito`).click();
    const deshacer = page.getByRole("button", { name: "Deshacer" });
    await expect(deshacer).toBeVisible();
    await expect(deshacer).toBeHidden({ timeout: 8_000 });
    await page.reload();
    await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
  });
});
