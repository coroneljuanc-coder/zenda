import { expect, test } from "@playwright/test";

// Categorías de los datos de ejemplo, en el orden del campo `orden` (RN1 de ZTV-10).
const CATEGORIAS = ["Ropa", "Hogar", "Tecnología", "Deportes", "Belleza y cuidado"];

test.describe("Menú de categorías (ZTV-35)", () => {
  test("CAT-01-CP1 · en escritorio muestra las categorías del seed en orden", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "En celular el menú se abre con el botón «Menú».");
    await page.goto("/");
    const menu = page.getByRole("banner").getByRole("navigation", { name: "Categorías" });
    await expect(menu.getByRole("link")).toHaveText(CATEGORIAS);
    await expect(menu.getByRole("link", { name: "Hogar" })).toHaveAttribute(
      "href",
      "/categoria/hogar",
    );
  });

  test("CAT-01-CP2 · en celular el botón ☰ abre y cierra el menú", async ({ page, isMobile }) => {
    test.skip(!isMobile, "El botón «Menú» solo aparece en celular.");
    await page.goto("/");
    const boton = page.getByRole("button", { name: "Menú" });
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("navigation", { name: "Categorías" })).toBeHidden();

    await boton.click();
    await expect(boton).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByRole("navigation", { name: "Categorías" });
    await expect(menu.getByRole("link")).toHaveText(CATEGORIAS);

    await page.getByRole("button", { name: "Cerrar" }).click();
    await expect(menu).toBeHidden();
    await expect(boton).toHaveAttribute("aria-expanded", "false");
  });

  test("CAT-01-CP2 · en celular el menú se cierra al elegir una categoría", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "El botón «Menú» solo aparece en celular.");
    await page.goto("/");
    await page.getByRole("button", { name: "Menú" }).click();
    await page
      .getByRole("navigation", { name: "Categorías" })
      .getByRole("link", { name: "Hogar" })
      .click();
    await expect(page).toHaveURL(/\/categoria\/hogar$/);
    await expect(page.getByRole("navigation", { name: "Categorías" })).toBeHidden();
  });
});
