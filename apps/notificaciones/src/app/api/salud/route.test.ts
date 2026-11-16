import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/salud", () => {
  it('responde 200 con {"estado":"ok"}', async () => {
    const respuesta = GET();
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ estado: "ok" });
  });
});
