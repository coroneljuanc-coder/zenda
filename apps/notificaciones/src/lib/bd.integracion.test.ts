// Pruebas de integración de la base de Notificaciones (ZTV-91): usan PostgreSQL real.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { GET } from "../app/api/salud/route";
import { baseDisponible, obtenerBD } from "./bd";

const bd = obtenerBD();
const vaciar = async () => {
  await bd.envioCorreo.deleteMany();
  await bd.eventoRecibido.deleteMany();
};
beforeEach(vaciar);
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

describe("base de datos de Notificaciones (ZTV-91)", () => {
  it("BDN-CP1 · la base responde y /api/salud?bd=1 da 200", async () => {
    expect(await baseDisponible(bd)).toBe(true);
    const r = await GET(new Request("https://notificaciones.test/api/salud?bd=1"));
    expect(r.status).toBe(200);
  });

  it("BDN-CP2 · las tablas existen y solo hay un correo por evento y tipo", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    await bd.eventoRecibido.create({
      data: {
        id,
        tipo: "pedido.pagado",
        version: 1,
        ocurridoEn: new Date(),
        datos: {},
        correos: { create: [{ tipo: "CONFIRMACION_CLIENTE", destinatario: "ana@ejemplo.com" }] },
      },
    });
    await expect(
      bd.envioCorreo.create({
        data: { eventoId: id, tipo: "CONFIRMACION_CLIENTE", destinatario: "ana@ejemplo.com" },
      }),
    ).rejects.toThrow();
  });

  it("BDN-CP3 · baseDisponible da false si la consulta falla, sin lanzar", async () => {
    const rota = {
      $queryRaw: async () => {
        throw new Error("conexión rechazada");
      },
    } as unknown as Parameters<typeof baseDisponible>[0];
    expect(await baseDisponible(rota)).toBe(false);
  });
});
