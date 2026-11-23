import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const original = process.env.DATABASE_URL;
afterEach(() => {
  process.env.DATABASE_URL = original;
});

describe("GET /api/salud", () => {
  it('responde 200 con {"estado":"ok"}', async () => {
    const respuesta = await GET(new Request("https://notificaciones.test/api/salud"));
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ estado: "ok" });
  });

  it("ZTV-91 · con ?bd=1 y sin base configurada: 503 sin detalles de la conexión", async () => {
    delete process.env.DATABASE_URL;
    const respuesta = await GET(new Request("https://notificaciones.test/api/salud?bd=1"));
    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ estado: "sin-base" });
  });
});
