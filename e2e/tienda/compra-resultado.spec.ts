import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { crearPedidoDePrueba, cerrarBD } from "./pedidos-bd";

// ZTV-22: la página de resultado según el estado del pedido. Los pedidos se crean directo en la
// base (sin pasar por Mercado Pago) con los datos del seed: 2 × Camiseta M / Negro.
test.describe("Resultado del pago (ZTV-22)", () => {
  test.afterAll(cerrarBD);

  test("COM-04-CP1 · aprobado: gracias, referencia, resumen, total, entrega y celular enmascarado", async ({
    page,
  }) => {
    const p = await crearPedidoDePrueba("PAGADO");
    await page.goto(`/pedido/resultado?ref=${p.referencia}&t=${p.token}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "¡Gracias por tu compra, Ana!",
    );
    await expect(page.getByText(`Tu pedido ${p.referencia} fue confirmado`)).toBeVisible();
    await expect(page.getByText("Camiseta básica de algodón (M / Negro)")).toBeVisible();
    await expect(page.locator('[data-prueba="total"]')).toHaveText("$ 111.800");
    await expect(page.getByText("Celular: 300 *** 4567")).toBeVisible();
    await expect(page.locator('[data-prueba="aviso-correo"]')).toHaveText(
      "Te enviamos la confirmación a ana@ejemplo.com",
    );
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });

  test("COM-04-CP2 · pendiente: mensaje de espera y la página se actualiza sola", async ({
    page,
  }) => {
    const p = await crearPedidoDePrueba("PENDIENTE_PAGO");
    await page.goto(`/pedido/resultado?ref=${p.referencia}&t=${p.token}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Estamos esperando la confirmación de tu banco. Esto puede tardar unos minutos.",
    );
    await expect(page.locator('[data-prueba="espera"]')).toHaveText(
      "Esta página se actualiza sola.",
    );
  });

  test("COM-04-CP3 · rechazado: mensaje y «Intentar de nuevo» lleva al carrito", async ({
    page,
  }) => {
    const p = await crearPedidoDePrueba("PAGO_RECHAZADO");
    await page.goto(`/pedido/resultado?ref=${p.referencia}&t=${p.token}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Tu pago no fue aprobado. No se realizó ningún cobro.",
    );
    await page.getByRole("link", { name: "Intentar de nuevo" }).click();
    await expect(page).toHaveURL(/\/carrito$/);
  });

  test("COM-04-CP4 · referencia válida con token incorrecto: 404 sin datos", async ({ page }) => {
    const p = await crearPedidoDePrueba("PAGADO");
    // La página se transmite por partes (Suspense), así que el 404 llega como contenido, no como
    // código HTTP: se verifica la página «No encontramos esta página» y que no haya datos.
    await page.goto(`/pedido/resultado?ref=${p.referencia}&t=incorrecto`);
    await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
    await expect(page.getByText("ana@ejemplo.com")).toHaveCount(0);
  });
});
