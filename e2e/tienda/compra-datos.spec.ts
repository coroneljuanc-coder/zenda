import { expect, test, type Page } from "@playwright/test";
import { agregarDesdeFicha } from "./ayudas";

// Datos de ejemplo (A8): 3 × Camiseta M / Negro = $ 149.700 + envío $ 12.000 = $ 161.700.
// Datos personales ficticios. Cada prueba abre un navegador nuevo, con el carrito vacío.

const principal = (page: Page) => page.getByRole("main");
const dato = (page: Page, nombre: string) =>
  principal(page).locator(`[data-prueba="${nombre}"]`).filter({ visible: true });
const campo = (page: Page, etiqueta: string) =>
  principal(page).getByLabel(etiqueta, { exact: true }).filter({ visible: true });

async function irAlFormulario(page: Page) {
  await agregarDesdeFicha(page, "camiseta-basica-algodon", {
    talla: "M",
    color: "Negro",
    cantidad: 3,
  });
  await page.goto("/carrito");
  await principal(page).getByRole("link", { name: "Continuar con la compra" }).click();
  await expect(page).toHaveURL(/\/compra$/);
  await expect(principal(page).getByRole("button", { name: "Continuar al pago" })).toBeEnabled();
}

async function llenarDatosDeAna(page: Page) {
  await campo(page, "Nombre completo").fill("Ana Prueba");
  await campo(page, "Correo electrónico").fill("ana@ejemplo.com");
  await campo(page, "Celular").fill("3001234567");
  await campo(page, "Departamento").selectOption({ label: "Antioquia" });
  await campo(page, "Ciudad o municipio").selectOption({ label: "Medellín" });
  await campo(page, "Dirección").fill("Cra 1 # 2-3");
  await principal(page)
    .getByRole("checkbox", { name: /Autorizo el tratamiento de mis datos personales/ })
    .check();
}

test.describe("Datos de contacto y envío (ZTV-19)", () => {
  test("COM-01-CP1 · con datos válidos llega al resumen con el total y «Pagar $ 161.700»", async ({
    page,
  }) => {
    await irAlFormulario(page);
    await expect(dato(page, "total")).toHaveText("$ 161.700");
    await llenarDatosDeAna(page);
    await principal(page).getByRole("button", { name: "Continuar al pago" }).click();

    await expect(page).toHaveURL(/\/compra\/resumen$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Revisa tu pedido");
    const datos = dato(page, "datos-entrega");
    await expect(datos).toContainText("Ana Prueba");
    await expect(datos).toContainText("Cra 1 # 2-3");
    await expect(datos).toContainText("Medellín, Antioquia");
    await expect(datos).toContainText("ana@ejemplo.com · 3001234567");
    await expect(dato(page, "linea-resumen")).toContainText("3 × Camiseta básica de algodón");
    await expect(dato(page, "subtotal")).toHaveText("$ 149.700");
    await expect(dato(page, "envio")).toHaveText("$ 12.000");
    await expect(dato(page, "total")).toHaveText("$ 161.700");
    await expect(principal(page).getByRole("button", { name: "Pagar $ 161.700" })).toBeVisible();
  });

  test("COM-01-CP2 · «Editar datos» vuelve al formulario con los datos diligenciados", async ({
    page,
  }) => {
    await irAlFormulario(page);
    await llenarDatosDeAna(page);
    await principal(page).getByRole("button", { name: "Continuar al pago" }).click();
    await expect(page).toHaveURL(/\/compra\/resumen$/);

    await principal(page).getByRole("link", { name: "Editar datos" }).click();
    await expect(page).toHaveURL(/\/compra$/);
    await expect(campo(page, "Nombre completo")).toHaveValue("Ana Prueba");
    await expect(campo(page, "Celular")).toHaveValue("3001234567");
    await expect(campo(page, "Departamento")).toHaveValue("05");
    await expect(campo(page, "Ciudad o municipio")).toHaveValue("05001");
    await expect(campo(page, "Dirección")).toHaveValue("Cra 1 # 2-3");
  });

  test("COM-01-CP5 · con errores no avanza, muestra los mensajes y lleva el foco al primero", async ({
    page,
  }) => {
    await irAlFormulario(page);
    await campo(page, "Nombre completo").fill("Ana Prueba");
    await campo(page, "Correo electrónico").fill("ana@ejemplo.com");
    await campo(page, "Celular").fill("12345");
    await campo(page, "Departamento").selectOption({ label: "Antioquia" });
    await campo(page, "Dirección").fill("Cra 1 # 2-3");
    await principal(page).getByRole("button", { name: "Continuar al pago" }).click();

    await expect(principal(page).getByText("Selecciona tu ciudad")).toBeVisible();
    await expect(
      principal(page).getByText("Ingresa un celular colombiano de 10 dígitos que empiece por 3"),
    ).toBeVisible();
    await expect(
      principal(page).getByText("Debes autorizar el tratamiento de tus datos para continuar"),
    ).toBeVisible();
    await expect(campo(page, "Celular")).toBeFocused();
    await expect(campo(page, "Celular")).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/compra$/);
  });

  test("COM-01-CP6 · /compra con el carrito vacío lleva al carrito", async ({ page }) => {
    await page.goto("/compra");
    await expect(page).toHaveURL(/\/carrito$/);
    await expect(page.getByText("Tu carrito está vacío")).toBeVisible();
  });

  test("el resumen sin datos guardados lleva al formulario", async ({ page }) => {
    await agregarDesdeFicha(page, "cargador-rapido-usb-c-30w");
    await page.goto("/compra/resumen");
    await expect(page).toHaveURL(/\/compra$/);
  });

  test("la Política de privacidad se puede leer", async ({ page }) => {
    await page.goto("/politica-de-privacidad");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Política de privacidad");
    await expect(page.getByText(/Ley 1581 de 2012/)).toBeVisible();
  });
});
