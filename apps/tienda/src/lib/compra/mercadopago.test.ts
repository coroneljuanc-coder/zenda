import { describe, expect, it } from "vitest";
import {
  consultarPago,
  crearPreferencia,
  cuerpoPreferencia,
  leerConfigMercadoPago,
  traducirEstado,
  verificarFirmaAviso,
} from "./mercadopago";

const config = { accessToken: "TEST-123", urlApi: "https://api.mercadopago.com" };

/** 3 × Camiseta M / Negro ($ 149.700) + envío $ 12.000 = $ 161.700. */
const datos = {
  referencia: "ZEN-20261122-7K3QD",
  lineas: [
    {
      varianteId: "var-1",
      nombreProducto: "Camiseta básica de algodón",
      descripcionVariante: "M / Negro",
      precioUnitario: 49_900,
      cantidad: 3,
    },
  ],
  envio: 12_000,
  urlBase: "https://zenda-tienda.vercel.app",
  tokenAcceso: "tokenAleatorio123",
};

const respuesta = (status: number, cuerpo: unknown) =>
  (async () => new Response(JSON.stringify(cuerpo), { status })) as unknown as typeof fetch;

describe("credenciales (RN1 de ZTV-86)", () => {
  it("solo acepta credenciales de prueba TEST-", () => {
    expect(leerConfigMercadoPago({ MERCADOPAGO_ACCESS_TOKEN: "TEST-abc" })).toEqual({
      accessToken: "TEST-abc",
      urlApi: "https://api.mercadopago.com",
    });
    expect(leerConfigMercadoPago({ MERCADOPAGO_ACCESS_TOKEN: "APP_USR-abc" })).toBeNull();
    expect(leerConfigMercadoPago({})).toBeNull();
  });
});

describe("orden de pago (RN2)", () => {
  it("COM-07-CP1 · productos y envío suman $ 161.700, con la referencia y el regreso a Zenda", () => {
    const cuerpo = cuerpoPreferencia(datos);
    const total = cuerpo.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    expect(total).toBe(161_700);
    expect(cuerpo.items).toEqual([
      {
        id: "var-1",
        title: "Camiseta básica de algodón (M / Negro)",
        quantity: 3,
        unit_price: 49_900,
        currency_id: "COP",
      },
      { id: "envio", title: "Envío", quantity: 1, unit_price: 12_000, currency_id: "COP" },
    ]);
    expect(cuerpo.external_reference).toBe("ZEN-20261122-7K3QD");
    expect(cuerpo.back_urls.success).toBe(
      "https://zenda-tienda.vercel.app/pedido/resultado?ref=ZEN-20261122-7K3QD&t=tokenAleatorio123",
    );
    expect(cuerpo).toMatchObject({
      auto_return: "approved",
      notification_url: "https://zenda-tienda.vercel.app/api/webhooks/mercadopago",
    });
    // Sin datos personales del cliente en la orden.
    expect(JSON.stringify(cuerpo)).not.toMatch(/payer|email/);
  });

  it("con envío gratis no agrega la línea de envío", () => {
    expect(cuerpoPreferencia({ ...datos, envio: 0 }).items).toHaveLength(1);
  });

  it("en el computador de desarrollo (http) no pide aviso ni regreso automático", () => {
    const cuerpo = cuerpoPreferencia({ ...datos, urlBase: "http://localhost:3000" });
    expect(cuerpo).not.toHaveProperty("notification_url");
    expect(cuerpo).not.toHaveProperty("auto_return");
  });

  it("en un ambiente protegido de Vercel, el aviso lleva el permiso para automatizaciones", () => {
    const cuerpo = cuerpoPreferencia({ ...datos, permisoVercel: "permiso123" });
    expect(cuerpo).toMatchObject({
      notification_url:
        "https://zenda-tienda.vercel.app/api/webhooks/mercadopago?x-vercel-protection-bypass=permiso123",
    });
  });

  it("devuelve la dirección de pago, o null si Mercado Pago falla o no responde", async () => {
    const ok = respuesta(201, {
      id: "pref-1",
      init_point: "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref-1",
    });
    expect(await crearPreferencia(config, datos, ok)).toEqual({
      id: "pref-1",
      url: "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref-1",
    });
    expect(await crearPreferencia(config, datos, respuesta(500, {}))).toBeNull();
    const caido = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    expect(await crearPreferencia(config, datos, caido)).toBeNull();
  });
});

describe("firma del aviso (escenario 3)", () => {
  // HMAC calculado aparte con `openssl dgst -sha256 -hmac`.
  const firmaBuena =
    "ts=1764000000,v1=8bc20f5ba06c3f06868e4f4769e94e2735dca861ef84e264038472393f859874";
  const base = { idSolicitud: "bb56a2f1-6aae-46ac-982e-9dcd3581d08e", idDato: "123456789" };

  it("COM-07-CP3 · acepta la firma correcta y rechaza una alterada, otra clave o sin firma", () => {
    expect(verificarFirmaAviso({ ...base, firma: firmaBuena }, "secreto_webhook_prueba")).toBe(
      true,
    );
    expect(verificarFirmaAviso({ ...base, firma: firmaBuena }, "otro_secreto")).toBe(false);
    expect(
      verificarFirmaAviso({ ...base, idDato: "999", firma: firmaBuena }, "secreto_webhook_prueba"),
    ).toBe(false);
    expect(
      verificarFirmaAviso({ ...base, firma: "ts=1764000000,v1=abc" }, "secreto_webhook_prueba"),
    ).toBe(false);
    expect(verificarFirmaAviso({ ...base, firma: null }, "secreto_webhook_prueba")).toBe(false);
  });
});

describe("consulta del pago (RN3)", () => {
  it("traduce los estados de Mercado Pago", () => {
    expect(traducirEstado("approved")).toBe("aprobado");
    expect(traducirEstado("rejected")).toBe("rechazado");
    expect(traducirEstado("cancelled")).toBe("rechazado");
    expect(traducirEstado("in_process")).toBe("pendiente");
    expect(traducirEstado("refunded")).toBe("otro");
  });

  it("lee el pago con su referencia, monto y método", async () => {
    const pago = respuesta(200, {
      id: 123456789,
      status: "approved",
      external_reference: "ZEN-20261122-7K3QD",
      transaction_amount: 161_700,
      currency_id: "COP",
      payment_method_id: "visa",
    });
    expect(await consultarPago(config, "123456789", pago)).toEqual({
      proveedor: "mercadopago",
      id: "123456789",
      referencia: "ZEN-20261122-7K3QD",
      estado: "aprobado",
      estadoOriginal: "approved",
      monto: 161_700,
      moneda: "COP",
      metodo: "visa",
    });
    expect(await consultarPago(config, "1", respuesta(404, {}))).toBeNull();
  });
});
