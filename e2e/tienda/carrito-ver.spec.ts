import { expect, test, type Page } from "@playwright/test";
import { agregarDesdeFicha as agregar } from "./ayudas";

// Datos de ejemplo (datos-ejemplo.ts): camiseta $ 49.900 (M / Negro, stock 15) y lámpara
// $ 89.900 (Negro, stock 12). 2 × 49.900 + 89.900 = $ 189.700; faltan $ 10.300 para el envío gratis.
// Cada prueba abre un navegador nuevo, así que empieza con el carrito vacío.

async function armarCarritoDeEjemplo(page: Page) {
  await agregar(page, "camiseta-basica-algodon", { talla: "M", color: "Negro", cantidad: 2 });
  await agregar(page, "lampara-escritorio-led", { color: "Negro" });
}

test.describe("Ver el carrito (ZTV-17)", () => {
  test("escenario 1 · cada línea con su variante, precio, cantidad y total; subtotal", async ({
    page,
  }) => {
    await armarCarritoDeEjemplo(page);
    await page.getByRole("link", { name: "Ver carrito" }).click();
    await expect(page).toHaveURL(/\/carrito$/);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tu carrito (3 productos)");
    const lineas = page.locator('[data-prueba="linea-carrito"]');
    await expect(lineas).toHaveCount(2);
    await expect(lineas.nth(0)).toContainText("Camiseta básica de algodón");
    await expect(lineas.nth(0)).toContainText("M / Negro");
    await expect(lineas.nth(0)).toContainText("Precio unitario: $ 49.900");
    await expect(lineas.nth(0).locator('[data-prueba="cantidad-linea"]')).toHaveText("2");
    await expect(lineas.nth(0).locator('[data-prueba="total-linea"]')).toHaveText("$ 99.800");
    await expect(lineas.nth(0).getByRole("img")).toHaveAttribute("alt", /^Foto de ejemplo: /);
    await expect(lineas.nth(1).locator('[data-prueba="total-linea"]')).toHaveText("$ 89.900");

    await expect(page.locator('[data-prueba="subtotal"]')).toHaveText("$ 189.700");
    await expect(page.getByRole("link", { name: "Continuar con la compra" })).toHaveAttribute(
      "href",
      "/compra",
    );
    await expect(page.getByRole("link", { name: "Seguir comprando" })).toHaveAttribute("href", "/");
  });

  test("CAR-02-CP7 · en celular se ven el resumen, el envío y el botón sin desplazarse de lado", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "La vista de celular se revisa en celular.");
    await armarCarritoDeEjemplo(page);
    await page.goto("/carrito");

    await expect(page.locator('[data-prueba="subtotal"]')).toHaveText("$ 189.700");
    await expect(page.locator('[data-prueba="mensaje-envio"]')).toHaveText(
      "Te faltan $ 10.300 para el envío gratis",
    );
    await expect(page.getByRole("link", { name: "Continuar con la compra" })).toBeInViewport();
    const anchoDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(anchoDocumento).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
  });

  test("escenario 2 · desde $ 200.000 el envío es gratis", async ({ page }) => {
    await agregar(page, "chaqueta-impermeable-liviana", { talla: "M", cantidad: 2 }); // $ 379.800
    await page.goto("/carrito");
    await expect(page.locator('[data-prueba="subtotal"]')).toHaveText("$ 379.800");
    await expect(page.locator('[data-prueba="mensaje-envio"]')).toHaveText("¡Tu envío es gratis!");
  });

  test("CAR-02-CP4 · el carrito vacío invita a explorar productos", async ({ page }) => {
    await page.goto("/carrito");
    await expect(page).toHaveTitle("Tu carrito | Zenda");
    await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
    await expect(page.getByRole("link", { name: "Explorar productos" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  test("la bolsa del encabezado lleva al carrito", async ({ page }) => {
    await agregar(page, "cargador-rapido-usb-c-30w");
    await page.getByRole("banner").getByRole("link", { name: "Carrito: 1 producto" }).click();
    await expect(page).toHaveURL(/\/carrito$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tu carrito (1 producto)");
  });
});
