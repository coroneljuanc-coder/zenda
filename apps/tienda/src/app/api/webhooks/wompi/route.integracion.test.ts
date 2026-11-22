// Prueba de integración del webhook de Wompi (ZTV-21): petición HTTP al endpoint con PostgreSQL real.
import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { guardarDatosEntrega } from "@/lib/compra/entrega";
import { crearPedido } from "@/lib/compra/pedido";
import { DATOS_ANA, armarCarrito, bd, crearCamiseta, vaciar } from "@/lib/compra/pruebas-bd";
import { POST } from "./route";

const SECRETO = "test_events_integracion";

beforeAll(() => {
  process.env.WOMPI_SECRETO_EVENTOS = SECRETO;
});
beforeEach(vaciar);
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

function avisoFirmado(referencia: string, centavos: number, secreto = SECRETO) {
  const transaction = {
    id: "1234-1764000000-00001",
    status: "APPROVED",
    reference: referencia,
    amount_in_cents: centavos,
    currency: "COP",
    payment_method_type: "CARD",
  };
  const timestamp = 1_764_000_000;
  const checksum = createHash("sha256")
    .update(
      `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${secreto}`,
    )
    .digest("hex")
    .toUpperCase();
  return {
    event: "transaction.updated",
    data: { transaction },
    environment: "test",
    signature: {
      properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
      checksum,
    },
    timestamp,
    sent_at: "2026-11-22T15:00:00.000Z",
  };
}

const enviar = (cuerpo: unknown) =>
  POST(
    new Request("http://localhost/api/webhooks/wompi", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    }),
  );

async function pedidoPendiente() {
  const varianteId = await crearCamiseta();
  const token = await armarCarrito(varianteId, 2);
  await guardarDatosEntrega(bd, { token, datos: DATOS_ANA });
  const r = await crearPedido(bd, { token, totalVisto: 111_800 });
  if (!r.ok) throw new Error(r.motivo);
  return { varianteId, referencia: r.pedido.referencia };
}

describe("POST /api/webhooks/wompi (ZTV-21)", () => {
  it("con la firma correcta responde 200, marca PAGADO y descuenta el stock", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    const respuesta = await enviar(avisoFirmado(referencia, 11_180_000));
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toEqual({ ok: true });
    expect((await bd.pedido.findFirstOrThrow()).estado).toBe("PAGADO");
    expect((await bd.varianteProducto.findUniqueOrThrow({ where: { id: varianteId } })).stock).toBe(
      13,
    );
  });

  it("COM-03-CP3 · checksum alterado: 400, nada cambia y el aviso queda registrado", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    const respuesta = await enviar(avisoFirmado(referencia, 11_180_000, "secreto_falso"));
    expect(respuesta.status).toBe(400);
    expect((await bd.pedido.findFirstOrThrow()).estado).toBe("PENDIENTE_PAGO");
    expect((await bd.varianteProducto.findUniqueOrThrow({ where: { id: varianteId } })).stock).toBe(
      15,
    );
    expect(await bd.eventoPago.findFirstOrThrow()).toMatchObject({
      referencia,
      resultado: "firma-invalida",
    });
  });

  it("un cuerpo que no es JSON o no tiene la forma de Wompi: 400", async () => {
    expect((await enviar("no es json")).status).toBe(400);
    expect((await enviar({ hola: "mundo" })).status).toBe(400);
  });

  it("la respuesta no expone datos del pedido", async () => {
    const { referencia } = await pedidoPendiente();
    const texto = await (await enviar(avisoFirmado(referencia, 11_180_000))).text();
    expect(texto).not.toContain(referencia);
    expect(texto).not.toContain("Ana");
  });
});
