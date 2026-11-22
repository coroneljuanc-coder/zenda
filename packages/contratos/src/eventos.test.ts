import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  EsquemaEventoPedidoPagado,
  firmarEvento,
  huellaClave,
  verificarFirmaEvento,
} from "./eventos";
import { EVENTO_EJEMPLO } from "./eventos-ejemplo";

const SECRETO = "secreto_eventos_prueba";
const AHORA = new Date("2026-11-23T15:00:00Z");

describe("contrato del evento pedido.pagado (ZTV-25)", () => {
  it("COM-06-CP1 · el evento de ejemplo cumple el contrato", () => {
    expect(EsquemaEventoPedidoPagado.safeParse(EVENTO_EJEMPLO).success).toBe(true);
  });

  it("COM-06-CP2 · rechaza otra versión, un tipo distinto o un pedido sin líneas", () => {
    expect(EsquemaEventoPedidoPagado.safeParse({ ...EVENTO_EJEMPLO, version: 2 }).success).toBe(
      false,
    );
    expect(EsquemaEventoPedidoPagado.safeParse({ ...EVENTO_EJEMPLO, tipo: "otro" }).success).toBe(
      false,
    );
    const sinLineas = { ...EVENTO_EJEMPLO, datos: { ...EVENTO_EJEMPLO.datos, lineas: [] } };
    expect(EsquemaEventoPedidoPagado.safeParse(sinLineas).success).toBe(false);
  });
});

describe("firma del evento (RN4 de ZTV-25)", () => {
  const cuerpo = JSON.stringify(EVENTO_EJEMPLO);

  it("COM-06-CP3 · firma HMAC-SHA256 de «segundos.cuerpo», calculada aparte", () => {
    const segundos = Math.floor(AHORA.getTime() / 1000);
    const esperado = createHmac("sha256", SECRETO).update(`${segundos}.${cuerpo}`).digest("hex");
    expect(firmarEvento(cuerpo, SECRETO, AHORA)).toBe(`t=${segundos},v1=${esperado}`);
  });

  it("COM-06-CP4 · válida con la misma clave; inválida si cambia la clave, el cuerpo o falta", () => {
    const firma = firmarEvento(cuerpo, SECRETO, AHORA);
    expect(verificarFirmaEvento(cuerpo, firma, SECRETO, AHORA)).toBe("valida");
    expect(verificarFirmaEvento(cuerpo, firma, "otra_clave", AHORA)).toBe("invalida");
    expect(verificarFirmaEvento(cuerpo + " ", firma, SECRETO, AHORA)).toBe("invalida");
    expect(verificarFirmaEvento(cuerpo, null, SECRETO, AHORA)).toBe("invalida");
    expect(verificarFirmaEvento(cuerpo, "t=abc,v1=00", SECRETO, AHORA)).toBe("invalida");
  });

  it("COM-06-CP5 · una firma de hace más de 5 minutos está vencida", () => {
    const hace6 = new Date(AHORA.getTime() - 6 * 60_000);
    const firma = firmarEvento(cuerpo, SECRETO, hace6);
    expect(verificarFirmaEvento(cuerpo, firma, SECRETO, AHORA)).toBe("vencida");
    const hace4 = new Date(AHORA.getTime() - 4 * 60_000);
    expect(verificarFirmaEvento(cuerpo, firmarEvento(cuerpo, SECRETO, hace4), SECRETO, AHORA)).toBe(
      "valida",
    );
  });
});

describe("huella de la clave (diagnóstico)", () => {
  it("8 caracteres, iguales para la misma clave y distintos para otra", () => {
    expect(huellaClave(SECRETO)).toMatch(/^[0-9a-f]{8}$/);
    expect(huellaClave(SECRETO)).toBe(huellaClave(SECRETO));
    expect(huellaClave(SECRETO)).not.toBe(huellaClave("otra"));
  });
});
