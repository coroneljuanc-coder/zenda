// Pruebas de integración de la recepción de eventos (ZTV-25): base real del servicio.
import { EVENTO_PEDIDO_PAGADO_EJEMPLO as EVENTO, firmarEvento } from "@zenda/contratos";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "../app/api/eventos/route";
import { obtenerBD } from "./bd";
import { recibirEvento } from "./eventos";

const SECRETO = "secreto_eventos_integracion";
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

function peticion(cuerpo: string, firma: string | null) {
  return {
    cuerpo,
    encabezados: new Headers(firma ? { "x-zenda-firma": firma } : {}),
  };
}
const cuerpo = JSON.stringify(EVENTO);

describe("recepción del evento pedido.pagado (ZTV-25)", () => {
  it("COM-06-CP6 · evento firmado: 200, queda registrado una vez", async () => {
    const r = await recibirEvento(bd, peticion(cuerpo, firmarEvento(cuerpo, SECRETO)), {
      secreto: SECRETO,
    });
    expect(r).toMatchObject({ estado: 200, nuevo: true });
    const guardado = await bd.eventoRecibido.findUniqueOrThrow({ where: { id: EVENTO.id } });
    expect(guardado).toMatchObject({ tipo: "pedido.pagado", version: 1 });
    expect(guardado.datos).toEqual(EVENTO.datos);
  });

  it("COM-06-CP7 · el mismo evento otra vez: 200 sin procesarlo de nuevo (escenario 4)", async () => {
    const firma = firmarEvento(cuerpo, SECRETO);
    await recibirEvento(bd, peticion(cuerpo, firma), { secreto: SECRETO });
    const r = await recibirEvento(bd, peticion(cuerpo, firma), { secreto: SECRETO });
    expect(r).toMatchObject({ estado: 200, nuevo: false });
    expect(await bd.eventoRecibido.count()).toBe(1);
  });

  it("COM-06-CP8 · firma de otra clave, ausente o de hace 6 minutos: 401 y nada se registra", async () => {
    const hace6 = new Date(Date.now() - 6 * 60_000);
    for (const firma of [
      firmarEvento(cuerpo, "otra"),
      null,
      firmarEvento(cuerpo, SECRETO, hace6),
    ]) {
      const r = await recibirEvento(bd, peticion(cuerpo, firma), { secreto: SECRETO });
      expect(r.estado).toBe(401);
    }
    expect(await bd.eventoRecibido.count()).toBe(0);
  });

  it("COM-06-CP9 · firma válida pero forma incorrecta: 400 y nada se registra", async () => {
    const malo = JSON.stringify({ ...EVENTO, version: 99 });
    const r = await recibirEvento(bd, peticion(malo, firmarEvento(malo, SECRETO)), {
      secreto: SECRETO,
    });
    expect(r.estado).toBe(400);
    expect(await bd.eventoRecibido.count()).toBe(0);
  });
});

describe("POST /api/eventos", () => {
  const original = process.env.ZENDA_SECRETO_EVENTOS;
  afterEach(() => {
    process.env.ZENDA_SECRETO_EVENTOS = original;
  });

  it("sin ZENDA_SECRETO_EVENTOS responde 503 (la tienda reintenta)", async () => {
    delete process.env.ZENDA_SECRETO_EVENTOS;
    const r = await POST(
      new Request("https://n.test/api/eventos", { method: "POST", body: cuerpo }),
    );
    expect(r.status).toBe(503);
  });

  it("con la clave: 200 «recibido» sin datos del pedido en la respuesta", async () => {
    process.env.ZENDA_SECRETO_EVENTOS = SECRETO;
    const r = await POST(
      new Request("https://n.test/api/eventos", {
        method: "POST",
        body: cuerpo,
        headers: { "x-zenda-firma": firmarEvento(cuerpo, SECRETO) },
      }),
    );
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ estado: "recibido" });
  });
});
