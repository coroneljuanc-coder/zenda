import { expect, test } from "@playwright/test";
import { irAlResumen } from "./ayudas";

// ZTV-20. Sin las llaves de prueba de Wompi (como en el CI), «Pagar» debe explicar que no pudo
// conectar con la pasarela y no dejar al cliente en un pago roto. Con las llaves (ambiente de
// revisión), llega al Web Checkout de Wompi con el monto correcto.
const hayLlaves = Boolean(process.env.WOMPI_LLAVE_PUBLICA);

test.describe("Crear pedido y redirigir al pago (ZTV-20)", () => {
  test("el resumen avisa que el pago es en Wompi y en modo de pruebas", async ({ page }) => {
    await irAlResumen(page);
    await expect(
      page
        .getByRole("main")
        .getByText(/Serás dirigido a Wompi.*Modo de pruebas: no se realizan cobros reales\./),
    ).toBeVisible();
  });

  test("COM-02-CP5 · sin conexión con Wompi muestra el mensaje y el carrito sigue guardado", async ({
    page,
  }) => {
    test.skip(hayLlaves, "Con llaves de prueba, Wompi sí responde.");
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

  test("COM-02-CP3 · «Pagar» lleva al Web Checkout de Wompi con $ 161.700", async ({ page }) => {
    test.skip(!hayLlaves, "Requiere las llaves de prueba de Wompi (WOMPI_LLAVE_PUBLICA).");
    await irAlResumen(page);
    await page.getByRole("main").getByRole("button", { name: "Pagar $ 161.700" }).click();
    await page.waitForURL(/checkout\.wompi\.co/);
    const url = new URL(page.url());
    expect(url.searchParams.get("amount-in-cents")).toBe("16170000");
    expect(url.searchParams.get("currency")).toBe("COP");
    expect(url.searchParams.get("reference")).toMatch(/^ZEN-\d{8}-[A-Z0-9]{5}$/);
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
