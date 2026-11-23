// Pruebas de integración de la bandeja de salida de eventos (ZTV-25): base real de la tienda.
import { EsquemaEventoPedidoPagado, verificarFirmaEvento } from "@zenda/contratos";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { guardarDatosEntrega } from "../compra/entrega";
import type { PagoPasarela } from "../compra/mercadopago";
import { procesarPago } from "../compra/pago";
import { crearPedido } from "../compra/pedido";
import { DATOS_ANA, armarCarrito, bd, crearCamiseta, vaciar } from "../compra/pruebas-bd";
import { PLAZO_ENTREGA_MS, entregarEventosPendientes, leerConfigEventos } from "./bandeja";

const CONFIG = { url: "https://notificaciones.test/api/eventos", secreto: "secreto_bandeja" };

beforeEach(async () => {
  await bd.eventoSaliente.deleteMany();
  await vaciar();
});
afterAll(async () => {
  await bd.eventoSaliente.deleteMany();
  await vaciar();
  await bd.$disconnect();
});

/** Pedido pagado de 2 × Camiseta M / Negro: $ 99.800 + envío $ 12.000 = $ 111.800. */
async function pedidoPagado() {
  const varianteId = await crearCamiseta();
  const token = await armarCarrito(varianteId, 2);
  await guardarDatosEntrega(bd, { token, datos: DATOS_ANA });
  const r = await crearPedido(bd, { token, totalVisto: 111_800 });
  if (!r.ok) throw new Error(r.motivo);
  const pago: PagoPasarela = {
    proveedor: "mercadopago",
    id: "pago-1",
    referencia: r.pedido.referencia,
    estado: "aprobado",
    estadoOriginal: "approved",
    monto: 111_800,
    moneda: "COP",
    metodo: "visa",
  };
  return { referencia: r.pedido.referencia, pago };
}

/** Servicio de Notificaciones simulado que guarda lo que recibe. */
function servicio(respuestas: number[]) {
  const recibidos: { cuerpo: string; firma: string | null }[] = [];
  const enviar = (async (_url: string, init: RequestInit) => {
    recibidos.push({
      cuerpo: String(init.body),
      firma: new Headers(init.headers).get("x-zenda-firma"),
    });
    const estado = respuestas.shift() ?? 200;
    return new Response("{}", { status: estado });
  }) as unknown as typeof fetch;
  return { enviar, recibidos };
}

describe("bandeja de salida: publicar (ZTV-25, RN1)", () => {
  it("COM-06-CP10 · un pago aprobado deja exactamente un evento pedido.pagado con la copia del pedido", async () => {
    const { referencia, pago } = await pedidoPagado();
    expect(await procesarPago(bd, pago)).toBe("pagado");
    expect(await procesarPago(bd, pago)).toBe("repetido");
    const eventos = await bd.eventoSaliente.findMany();
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ tipo: "pedido.pagado", version: 1, estado: "PENDIENTE" });
    expect(eventos[0].datos).toMatchObject({
      referencia,
      cliente: { nombre: DATOS_ANA.nombreCompleto, correo: DATOS_ANA.correo },
      subtotal: 99_800,
      envio: 12_000,
      total: 111_800,
      metodoPago: "visa",
      lineas: [{ cantidad: 2, precioUnitario: 49_900, totalLinea: 99_800 }],
    });
  });

  it("un pago rechazado no publica ningún evento", async () => {
    const { pago } = await pedidoPagado();
    await procesarPago(bd, { ...pago, estado: "rechazado", estadoOriginal: "rejected" });
    expect(await bd.eventoSaliente.count()).toBe(0);
  });
});

describe("bandeja de salida: entregar (ZTV-25)", () => {
  it("COM-06-CP11 · entrega normal: evento firmado que cumple el contrato y queda ENTREGADO", async () => {
    const { pago } = await pedidoPagado();
    await procesarPago(bd, pago);
    const { enviar, recibidos } = servicio([200]);
    const ahora = new Date();
    expect(await entregarEventosPendientes(bd, CONFIG, { enviar, ahora })).toEqual({
      entregados: 1,
      reintentar: 0,
      fallidos: 0,
    });
    expect(recibidos).toHaveLength(1);
    const { cuerpo, firma } = recibidos[0];
    expect(verificarFirmaEvento(cuerpo, firma, CONFIG.secreto, ahora)).toBe("valida");
    expect(EsquemaEventoPedidoPagado.safeParse(JSON.parse(cuerpo)).success).toBe(true);
    expect(await bd.eventoSaliente.findFirstOrThrow()).toMatchObject({
      estado: "ENTREGADO",
      intentos: 1,
    });
  });

  it("COM-06-CP12 · servicio caído: el pedido sigue PAGADO y el evento se reintenta en 1 minuto", async () => {
    const { pago } = await pedidoPagado();
    await procesarPago(bd, pago);
    const ahora = new Date();
    const { enviar } = servicio([503]);
    expect(await entregarEventosPendientes(bd, CONFIG, { enviar, ahora })).toMatchObject({
      reintentar: 1,
    });
    const e = await bd.eventoSaliente.findFirstOrThrow();
    expect(e).toMatchObject({ estado: "PENDIENTE", intentos: 1, ultimoError: "HTTP 503" });
    expect(e.proximoIntento.getTime()).toBe(ahora.getTime() + 60_000);
    expect((await bd.pedido.findFirstOrThrow()).estado).toBe("PAGADO");
    // Antes del minuto no se vuelve a intentar; después sí, y se entrega.
    const otro = servicio([200]);
    await entregarEventosPendientes(bd, CONFIG, { enviar: otro.enviar, ahora });
    expect(otro.recibidos).toHaveLength(0);
    await entregarEventosPendientes(bd, CONFIG, {
      enviar: otro.enviar,
      ahora: new Date(ahora.getTime() + 61_000),
    });
    expect((await bd.eventoSaliente.findFirstOrThrow()).estado).toBe("ENTREGADO");
  });

  it("COM-06-CP13 · después de 24 horas sin entregarse queda FALLIDO con alerta", async () => {
    const { pago } = await pedidoPagado();
    await procesarPago(bd, pago);
    const e = await bd.eventoSaliente.findFirstOrThrow();
    const { enviar } = servicio([503]);
    await entregarEventosPendientes(bd, CONFIG, {
      enviar,
      ahora: new Date(e.ocurridoEn.getTime() + PLAZO_ENTREGA_MS),
    });
    expect(await bd.eventoSaliente.findFirstOrThrow()).toMatchObject({ estado: "FALLIDO" });
  });

  it("COM-06-CP14 · dos entregas a la vez no envían el mismo evento dos veces", async () => {
    const { pago } = await pedidoPagado();
    await procesarPago(bd, pago);
    const { enviar, recibidos } = servicio([200, 200]);
    const ahora = new Date();
    await Promise.all([
      entregarEventosPendientes(bd, CONFIG, { enviar, ahora }),
      entregarEventosPendientes(bd, CONFIG, { enviar, ahora }),
    ]);
    expect(recibidos).toHaveLength(1);
  });

  it("leerConfigEventos exige la dirección del servicio y la clave", () => {
    expect(leerConfigEventos({})).toBeNull();
    expect(leerConfigEventos({ URL_NOTIFICACIONES: "https://n.test" })).toBeNull();
    expect(
      leerConfigEventos({ URL_NOTIFICACIONES: "https://n.test/", ZENDA_SECRETO_EVENTOS: "s" }),
    ).toEqual({ url: "https://n.test/api/eventos", secreto: "s" });
  });
});
