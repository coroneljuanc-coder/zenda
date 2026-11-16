import { expect, test } from "@playwright/test";

test("el servicio de Notificaciones está en línea", async ({ request }) => {
  const respuesta = await request.get("/api/salud");
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toEqual({ estado: "ok" });
});
