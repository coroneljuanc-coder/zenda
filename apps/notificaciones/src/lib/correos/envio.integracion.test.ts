// Pruebas de integración del envío de correos (ZTV-23): base real del servicio, Resend simulado.
import { EVENTO_PEDIDO_PAGADO_EJEMPLO as EVENTO } from "@zenda/contratos";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { obtenerBD } from "../bd";
import {
  enviadorResend,
  enviarCorreosPedido,
  leerConfigCorreo,
  type ConfigCorreo,
  type MensajeCorreo,
} from "./envio";

const bd = obtenerBD();
const CONFIG: ConfigCorreo = {
  apiKey: "re_prueba",
  remitente: "Zenda <onboarding@resend.dev>",
  correoVendedor: "vendedor@zenda.test",
  modoPruebas: true,
};
const sinEspera = async () => {};

beforeEach(async () => {
  await bd.envioCorreo.deleteMany();
  await bd.eventoRecibido.deleteMany();
  await bd.eventoRecibido.create({
    data: {
      id: EVENTO.id,
      tipo: EVENTO.tipo,
      version: EVENTO.version,
      ocurridoEn: new Date(EVENTO.ocurridoEn),
      datos: EVENTO.datos,
    },
  });
});
afterAll(async () => {
  await bd.envioCorreo.deleteMany();
  await bd.eventoRecibido.deleteMany();
  await bd.$disconnect();
});

/** Resend simulado: falla las primeras `fallas` veces y guarda lo que se envía. */
function resend(fallas = 0) {
  const enviados: MensajeCorreo[] = [];
  let llamadas = 0;
  const enviar = async (m: MensajeCorreo) => {
    llamadas++;
    if (llamadas <= fallas) throw new Error("Resend respondió 503");
    enviados.push(m);
    return `re_${enviados.length}`;
  };
  return { enviar, enviados, llamadas: () => llamadas };
}

describe("correos de compra (ZTV-23)", () => {
  it("COM-05-CP1 · confirmación al cliente y aviso al vendedor; en modo de pruebas llegan al vendedor", async () => {
    const { enviar, enviados } = resend();
    const r = await enviarCorreosPedido(bd, EVENTO.id, CONFIG, { enviar, esperar: sinEspera });
    expect(r).toEqual({ enviados: 2, fallidos: 0, omitidos: 0 });
    expect(enviados.map((m) => [m.para, m.asunto])).toEqual([
      ["vendedor@zenda.test", "Confirmación de tu pedido ZEN-20261123-7K3QD en Zenda"],
      ["vendedor@zenda.test", "Nuevo pedido pagado: ZEN-20261123-7K3QD – $ 161.700"],
    ]);
    expect(enviados[0].texto).toContain("Para: ana@ejemplo.com (modo de pruebas)");
    const registros = await bd.envioCorreo.findMany({ orderBy: { tipo: "asc" } });
    expect(registros.map((x) => [x.tipo, x.destinatario, x.estado])).toEqual([
      ["CONFIRMACION_CLIENTE", "ana@ejemplo.com", "ENVIADO"],
      ["AVISO_VENDEDOR", "vendedor@zenda.test", "ENVIADO"],
    ]);
  });

  it("con correos reales activados, la confirmación va al correo del cliente", async () => {
    const { enviar, enviados } = resend();
    await enviarCorreosPedido(bd, EVENTO.id, { ...CONFIG, modoPruebas: false }, { enviar });
    expect(enviados[0].para).toBe("ana@ejemplo.com");
    expect(enviados[0].texto).not.toContain("modo de pruebas)");
  });

  it("COM-05-CP4 · Resend falla 3 veces: 3 intentos, correo FALLIDO y alerta", async () => {
    const { enviar, llamadas } = resend(99);
    const r = await enviarCorreosPedido(bd, EVENTO.id, CONFIG, { enviar, esperar: sinEspera });
    expect(r).toEqual({ enviados: 0, fallidos: 2, omitidos: 0 });
    expect(llamadas()).toBe(6);
    const cliente = await bd.envioCorreo.findFirstOrThrow({
      where: { tipo: "CONFIRMACION_CLIENTE" },
    });
    expect(cliente).toMatchObject({
      estado: "FALLIDO",
      intentos: 3,
      ultimoError: "Resend respondió 503",
    });
  });

  it("un fallo pasajero se recupera en el segundo intento", async () => {
    const { enviar, enviados } = resend(1);
    const r = await enviarCorreosPedido(bd, EVENTO.id, CONFIG, { enviar, esperar: sinEspera });
    expect(r.enviados).toBe(2);
    expect(enviados).toHaveLength(2);
  });

  it("COM-05-CP5 · el mismo evento otra vez no envía un segundo correo", async () => {
    const primero = resend();
    await enviarCorreosPedido(bd, EVENTO.id, CONFIG, { enviar: primero.enviar });
    const segundo = resend();
    const r = await enviarCorreosPedido(bd, EVENTO.id, CONFIG, { enviar: segundo.enviar });
    expect(r).toEqual({ enviados: 0, fallidos: 0, omitidos: 2 });
    expect(segundo.enviados).toHaveLength(0);
  });

  it("dos procesos a la vez tampoco duplican los correos", async () => {
    const { enviar, enviados } = resend();
    await Promise.all([
      enviarCorreosPedido(bd, EVENTO.id, CONFIG, { enviar }),
      enviarCorreosPedido(bd, EVENTO.id, CONFIG, { enviar }),
    ]);
    expect(enviados).toHaveLength(2);
  });
});

describe("configuración y Resend", () => {
  it("RN3 · exige la llave de Resend y el correo del vendedor; modo de pruebas por defecto", () => {
    expect(leerConfigCorreo({})).toBeNull();
    expect(leerConfigCorreo({ RESEND_API_KEY: "re_x" })).toBeNull();
    expect(leerConfigCorreo({ RESEND_API_KEY: "re_x", CORREO_VENDEDOR: "v@z.test" })).toMatchObject(
      {
        modoPruebas: true,
        remitente: "Zenda <onboarding@resend.dev>",
      },
    );
    expect(
      leerConfigCorreo({
        RESEND_API_KEY: "re_x",
        CORREO_VENDEDOR: "v@z.test",
        ZENDA_CORREOS_REALES: "1",
      })?.modoPruebas,
    ).toBe(false);
  });

  it("envía a la API de Resend con la llave, la llave de idempotencia y las dos versiones", async () => {
    const pedidos: { url: string; init: RequestInit }[] = [];
    const pedirA = (async (url: string, init: RequestInit) => {
      pedidos.push({ url, init });
      return new Response(JSON.stringify({ id: "re_123" }), { status: 200 });
    }) as unknown as typeof fetch;
    const id = await enviadorResend(
      CONFIG,
      pedirA,
    )({
      para: "v@z.test",
      asunto: "Asunto",
      html: "<p>Hola</p>",
      texto: "Hola",
      idempotencia: "evento-1-CONFIRMACION_CLIENTE",
    });
    expect(id).toBe("re_123");
    expect(pedidos[0].url).toBe("https://api.resend.com/emails");
    const h = new Headers(pedidos[0].init.headers);
    expect(h.get("authorization")).toBe("Bearer re_prueba");
    expect(h.get("idempotency-key")).toBe("evento-1-CONFIRMACION_CLIENTE");
    expect(JSON.parse(String(pedidos[0].init.body))).toEqual({
      from: "Zenda <onboarding@resend.dev>",
      to: ["v@z.test"],
      subject: "Asunto",
      html: "<p>Hola</p>",
      text: "Hola",
    });
    const fallo = (async () => new Response("{}", { status: 403 })) as unknown as typeof fetch;
    await expect(
      enviadorResend(
        CONFIG,
        fallo,
      )({ para: "x", asunto: "a", html: "", texto: "", idempotencia: "i" }),
    ).rejects.toThrow("Resend respondió 403");
  });
});
