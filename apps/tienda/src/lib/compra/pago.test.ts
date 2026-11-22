import { describe, expect, it } from "vitest";
import { leerEvento, verificarChecksumWompi } from "./pago";

const SECRETO = "test_events_prueba456";

/** Aviso con la forma de Wompi; el checksum se calculó aparte con `sha256sum`. */
const aviso = {
  event: "transaction.updated",
  data: {
    transaction: {
      id: "1234-1610641025-49201",
      status: "APPROVED",
      reference: "ZEN-20261122-7K3QD",
      amount_in_cents: 16_170_000,
      currency: "COP",
      payment_method_type: "CARD",
    },
  },
  environment: "test",
  signature: {
    properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
    checksum: "DF4A3D1B5FAE702FB520B6B41BCE5B78F0FAF7E25C0B22495B382A9EA11A3457",
  },
  timestamp: 1_764_000_000,
  sent_at: "2026-11-22T15:00:00.000Z",
};

describe("verificarChecksumWompi (RN1 de ZTV-21)", () => {
  it("COM-03-CP7 · acepta el aviso con el checksum correcto (mayúsculas o minúsculas)", () => {
    const evento = leerEvento(aviso)!;
    expect(verificarChecksumWompi(evento, SECRETO)).toBe(true);
    const minusculas = {
      ...evento,
      signature: { ...evento.signature, checksum: evento.signature.checksum.toLowerCase() },
    };
    expect(verificarChecksumWompi(minusculas, SECRETO)).toBe(true);
  });

  it("COM-03-CP7 · rechaza un monto alterado, otro secreto o un checksum cortado", () => {
    const alterado = leerEvento({
      ...aviso,
      data: { transaction: { ...aviso.data.transaction, amount_in_cents: 100 } },
    })!;
    expect(verificarChecksumWompi(alterado, SECRETO)).toBe(false);
    expect(verificarChecksumWompi(leerEvento(aviso)!, "otro_secreto")).toBe(false);
    const cortado = leerEvento({ ...aviso, signature: { ...aviso.signature, checksum: "DF4A" } })!;
    expect(verificarChecksumWompi(cortado, SECRETO)).toBe(false);
  });

  it("un cuerpo sin la forma de Wompi no se acepta", () => {
    expect(leerEvento({ hola: "mundo" })).toBeNull();
    expect(leerEvento(null)).toBeNull();
  });
});
