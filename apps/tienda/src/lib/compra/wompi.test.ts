import { describe, expect, it } from "vitest";
import { FORMATO_REFERENCIA, generarReferencia, generarTokenAcceso } from "./referencia";
import {
  URL_CHECKOUT,
  aCentavos,
  firmaIntegridad,
  leerConfigWompi,
  urlCheckout,
  wompiDisponible,
} from "./wompi";

const config = {
  llavePublica: "pub_test_abc",
  secretoIntegridad: "test_integrity_prueba123",
  urlApi: "https://sandbox.wompi.co/v1",
};

describe("firma de integridad (RN4 de ZTV-20)", () => {
  it("COM-02-CP2 · SHA-256 de referencia + centavos + moneda + secreto", () => {
    // Valor calculado aparte con `sha256sum`.
    expect(
      firmaIntegridad("ZEN-20261122-7K3QD", 16_170_000, "COP", "test_integrity_prueba123"),
    ).toBe("e6ee3542fe9d67843b3c448ea0aae3c1e4f137f81d7ad4c0d8d1dc307b6dff09");
  });

  it("$ 161.700 viajan como 16.170.000 centavos", () => {
    expect(aCentavos(161_700)).toBe(16_170_000);
  });
});

describe("referencia del pedido (RN3)", () => {
  it("COM-02-CP7 · 10.000 referencias con el formato ZEN-AAAAMMDD-XXXXX y la fecha de Colombia", () => {
    // 23:30 del 22 de noviembre en Bogotá ya es 23 de noviembre en UTC.
    const fecha = new Date("2026-11-23T04:30:00Z");
    const referencias = Array.from({ length: 10_000 }, () => generarReferencia(fecha));
    for (const r of referencias) {
      expect(r).toMatch(FORMATO_REFERENCIA);
      expect(r.startsWith("ZEN-20261122-")).toBe(true);
    }
    // Con 36^5 combinaciones casi todas son distintas; la base de datos garantiza la unicidad
    // y el pedido reintenta con otra si choca (ver pedido.integracion.test.ts).
    expect(new Set(referencias).size).toBeGreaterThan(9_990);
  });

  it("el token de acceso es largo y aleatorio", () => {
    const a = generarTokenAcceso();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(generarTokenAcceso()).not.toBe(a);
  });
});

describe("configuración de Wompi", () => {
  it("solo acepta llaves de pruebas (pub_test_)", () => {
    const base = { WOMPI_SECRETO_INTEGRIDAD: "secreto" };
    expect(leerConfigWompi({ ...base, WOMPI_LLAVE_PUBLICA: "pub_test_x" })).toMatchObject({
      llavePublica: "pub_test_x",
      urlApi: "https://sandbox.wompi.co/v1",
    });
    expect(leerConfigWompi({ ...base, WOMPI_LLAVE_PUBLICA: "pub_prod_x" })).toBeNull();
    expect(leerConfigWompi({ WOMPI_LLAVE_PUBLICA: "pub_test_x" })).toBeNull();
    expect(leerConfigWompi({})).toBeNull();
  });

  it("la dirección del Web Checkout lleva el monto firmado y no lleva datos personales", () => {
    const url = new URL(
      urlCheckout(config, {
        referencia: "ZEN-20261122-7K3QD",
        total: 161_700,
        urlRegreso: "https://tienda.test/pedido/resultado?ref=ZEN-20261122-7K3QD&t=abc",
      }),
    );
    expect(`${url.origin}${url.pathname}`).toBe(URL_CHECKOUT);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      "public-key": "pub_test_abc",
      currency: "COP",
      "amount-in-cents": "16170000",
      reference: "ZEN-20261122-7K3QD",
      "signature:integrity": "e6ee3542fe9d67843b3c448ea0aae3c1e4f137f81d7ad4c0d8d1dc307b6dff09",
      "redirect-url": "https://tienda.test/pedido/resultado?ref=ZEN-20261122-7K3QD&t=abc",
    });
  });

  it("escenario 3: Wompi no disponible si responde con error o no responde", async () => {
    const ok = (async () => new Response("{}", { status: 200 })) as typeof fetch;
    const error = (async () => new Response("", { status: 503 })) as typeof fetch;
    const caido = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    expect(await wompiDisponible(config, ok)).toBe(true);
    expect(await wompiDisponible(config, error)).toBe(false);
    expect(await wompiDisponible(config, caido)).toBe(false);
  });
});
