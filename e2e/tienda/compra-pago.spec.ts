import { expect, test } from "@playwright/test";
import { irAlResumen } from "./ayudas";

// ZTV-20 y ZTV-86. Sin las credenciales de prueba de Mercado Pago (como en el CI), «Pagar» debe explicar que no pudo
// conectar con la pasarela y no dejar al cliente en un pago roto. Con las credenciales (ambiente de
// revisión), llega a la página de pago de Mercado Pago.
const hayLlaves = Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);

test.describe("Crear pedido y redirigir al pago (ZTV-20)", () => {
  test("el resumen avisa que el pago es en Mercado Pago y en modo de pruebas", async ({ page }) => {
    await irAlResumen(page);
    await expect(
      page
        .getByRole("main")
        .getByText(
          /Serás dirigido a Mercado Pago.*Modo de pruebas: no se realizan cobros reales\./,
        ),
    ).toBeVisible();
  });

  test("COM-07-CP4 · sin conexión con la pasarela muestra el mensaje y el carrito sigue guardado", async ({
    page,
  }) => {
    test.skip(hayLlaves, "Con credenciales de prueba, Mercado Pago sí responde.");
    await irAlResumen(page);
    const pagar = page.getByRole("main").getByRole("button", { name: "Pagar $ 161.700" });
    await expect(pagar).toBeEnabled();
    await pagar.click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "No pudimos conectar con la pasarela de pago. Tu carrito sigue guardado; intenta de nuevo en unos minutos.",
    );
    await expect(page).toHaveURL(/\/compra\/resumen$/);
    await page.goto("/carrito");
    await expect(
      page.locator('[data-prueba="linea-carrito"]').filter({ visible: true }),
    ).toHaveCount(1);
  });

  test("COM-07-CP1 · «Pagar» lleva a la página de pago de Mercado Pago", async ({ page }) => {
    test.skip(
      !hayLlaves,
      "Requiere las credenciales de prueba de Mercado Pago (MERCADOPAGO_ACCESS_TOKEN).",
    );
    await irAlResumen(page);
    await page.getByRole("main").getByRole("button", { name: "Pagar $ 161.700" }).click();
    await page.waitForURL(/mercadopago.com/);
    expect(new URL(page.url()).searchParams.get("pref_id")).toBeTruthy();
  });

  test("el aviso de cambios del catálogo se muestra en el carrito", async ({ page }) => {
    await page.goto("/carrito?aviso=cambios");
    await expect(page.locator('[data-prueba="aviso-cambios"]')).toHaveText(
      "Actualizamos tu carrito porque algunos productos cambiaron. Revisa antes de pagar.",
    );
  });

  test("la página del resultado no se abre sin la referencia y el token correctos", async ({
    page,
  }) => {
    await page.goto("/pedido/resultado?ref=ZEN-20261122-AAAAA&t=falso");
    await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  });
});
