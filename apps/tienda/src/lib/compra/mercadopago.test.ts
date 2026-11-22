import { describe, expect, it } from "vitest";
import {
  consultarPago,
  crearPreferencia,
  cuerpoPreferencia,
  esCuentaDePrueba,
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
  it("ZTV-89 · acepta el Access Token de prueba actual (APP_USR-) y el anterior (TEST-)", () => {
    expect(leerConfigMercadoPago({ MERCADOPAGO_ACCESS_TOKEN: " APP_USR-123-abc " })).toEqual({
      accessToken: "APP_USR-123-abc",
      urlApi: "https://api.mercadopago.com",
    });
    expect(leerConfigMercadoPago({ MERCADOPAGO_ACCESS_TOKEN: "TEST-abc" })?.accessToken).toBe(
      "TEST-abc",
    );
  });

  it("rechaza una credencial ausente o que no es de Mercado Pago", () => {
    expect(leerConfigMercadoPago({})).toBeNull();
    expect(leerConfigMercadoPago({ MERCADOPAGO_ACCESS_TOKEN: "   " })).toBeNull();
    expect(leerConfigMercadoPago({ MERCADOPAGO_ACCESS_TOKEN: "pub_test_abc" })).toBeNull();
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

describe("solo cuentas de prueba (RN1, ZTV-89)", () => {
  const preferencia = {
    id: "pref-9",
    init_point: "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref-9",
  };
  /** Mercado Pago simulado: /users/me responde con las etiquetas dadas; lo demás, la preferencia. */
  const conEtiquetas = (tags: string[] | null, pedidas: string[] = []) =>
    (async (url: string | URL | Request) => {
      const ruta = String(url);
      pedidas.push(ruta);
      if (ruta.endsWith("/users/me"))
        return tags === null
          ? new Response("{}", { status: 401 })
          : new Response(JSON.stringify({ id: 1, tags }), { status: 200 });
      return new Response(JSON.stringify(preferencia), { status: 201 });
    }) as unknown as typeof fetch;
  const app = (token: string) => ({ accessToken: token, urlApi: "https://api.mercadopago.com" });

  it("con el vendedor de prueba (APP_USR- y etiqueta test_user) crea la orden de pago", async () => {
    const pedidas: string[] = [];
    const r = await crearPreferencia(
      app("APP_USR-prueba-1"),
      datos,
      conEtiquetas(["normal", "test_user"], pedidas),
    );
    expect(r?.id).toBe("pref-9");
    expect(pedidas).toEqual([
      "https://api.mercadopago.com/users/me",
      "https://api.mercadopago.com/checkout/preferences",
    ]);
  });

  it("con una cuenta real (APP_USR- sin test_user) no crea la orden de pago", async () => {
    const pedidas: string[] = [];
    expect(
      await crearPreferencia(app("APP_USR-real-1"), datos, conEtiquetas(["normal"], pedidas)),
    ).toBeNull();
    expect(pedidas).toEqual(["https://api.mercadopago.com/users/me"]);
  });

  it("si no se puede confirmar la cuenta, no cobra", async () => {
    expect(await esCuentaDePrueba(app("APP_USR-sin-respuesta"), conEtiquetas(null))).toBe(false);
  });

  it("las credenciales TEST- son de prueba sin consultar", async () => {
    const pedidas: string[] = [];
    expect(await esCuentaDePrueba(app("TEST-abc"), conEtiquetas([], pedidas))).toBe(true);
    expect(pedidas).toEqual([]);
  });
});
