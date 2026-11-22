// Pruebas de integración de la confirmación del pago (ZTV-21): usan PostgreSQL real.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { guardarDatosEntrega } from "./entrega";
import { type EventoWompi, procesarEventoPago } from "./pago";
import { crearPedido } from "./pedido";
import { DATOS_ANA, armarCarrito, bd, crearCamiseta, vaciar } from "./pruebas-bd";

beforeEach(vaciar);
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

/** Pedido pendiente de 2 × Camiseta M / Negro (stock 15): $ 99.800 + envío = $ 111.800. */
async function pedidoPendiente({ stock = 15 } = {}) {
  const varianteId = await crearCamiseta({ stock });
  const token = await armarCarrito(varianteId, 2);
  await guardarDatosEntrega(bd, { token, datos: DATOS_ANA });
  const r = await crearPedido(bd, { token, totalVisto: 111_800 });
  if (!r.ok) throw new Error(r.motivo);
  return { varianteId, token, referencia: r.pedido.referencia };
}

function evento(referencia: string, estado: string, centavos = 11_180_000): EventoWompi {
  return {
    event: "transaction.updated",
    data: {
      transaction: {
        id: `tx-${estado}`,
        status: estado,
        reference: referencia,
        amount_in_cents: centavos,
        currency: "COP",
        payment_method_type: "CARD",
      },
    },
    signature: { properties: ["transaction.id"], checksum: "verificado-antes" },
    timestamp: 1_764_000_000,
  };
}

const stockDe = async (id: string) =>
  (await bd.varianteProducto.findUniqueOrThrow({ where: { id } })).stock;
const pedido = () => bd.pedido.findFirstOrThrow({ orderBy: { creadoEn: "desc" } });

describe("confirmar el pago (ZTV-21)", () => {
  it("COM-03-CP1 · APPROVED: pedido PAGADO, stock 15 → 13 y carrito vacío (RN2, RN6)", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    expect(await procesarEventoPago(bd, evento(referencia, "APPROVED"))).toBe("pagado");
    expect(await pedido()).toMatchObject({
      estado: "PAGADO",
      wompiTransaccionId: "tx-APPROVED",
      metodoPago: "CARD",
    });
    expect((await pedido()).pagadoEn).toBeInstanceOf(Date);
    expect(await stockDe(varianteId)).toBe(13);
    expect(await bd.lineaCarrito.count()).toBe(0);
    expect(await bd.eventoPago.findFirstOrThrow()).toMatchObject({
      referencia,
      resultado: "pagado",
    });
  });

  it("COM-03-CP2 · DECLINED: PAGO_RECHAZADO, stock y carrito intactos", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    expect(await procesarEventoPago(bd, evento(referencia, "DECLINED"))).toBe("rechazado");
    expect((await pedido()).estado).toBe("PAGO_RECHAZADO");
    expect(await stockDe(varianteId)).toBe(15);
    expect(await bd.lineaCarrito.count()).toBe(1);
  });

  it("ERROR y VOIDED también son rechazo", async () => {
    const { referencia } = await pedidoPendiente();
    expect(await procesarEventoPago(bd, evento(referencia, "VOIDED"))).toBe("rechazado");
    await bd.pedido.updateMany({ data: { estado: "PENDIENTE_PAGO" } });
    expect(await procesarEventoPago(bd, evento(referencia, "ERROR"))).toBe("rechazado");
  });

  it("COM-03-CP4 · monto 1 peso distinto: REQUIERE_REVISION y stock intacto", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    expect(await procesarEventoPago(bd, evento(referencia, "APPROVED", 11_180_100))).toBe(
      "revision-monto",
    );
    expect((await pedido()).estado).toBe("REQUIERE_REVISION");
    expect(await stockDe(varianteId)).toBe(15);
  });

  it("COM-03-CP5 · el mismo APPROVED tres veces descuenta el stock una sola vez (RN4)", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    const resultados = [];
    for (let i = 0; i < 3; i++)
      resultados.push(await procesarEventoPago(bd, evento(referencia, "APPROVED")));
    expect(resultados).toEqual(["pagado", "repetido", "repetido"]);
    expect(await stockDe(varianteId)).toBe(13);
    expect(await bd.eventoPago.count()).toBe(3);
  });

  it("RN4 · tres APPROVED simultáneos también descuentan una sola vez", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    const resultados = await Promise.all(
      [1, 2, 3].map(() => procesarEventoPago(bd, evento(referencia, "APPROVED"))),
    );
    expect(resultados.filter((r) => r === "pagado")).toHaveLength(1);
    expect(await stockDe(varianteId)).toBe(13);
  });

  it("COM-03-CP6 · stock 1 y pedido de 2: REQUIERE_REVISION y el stock no queda negativo (RN3)", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    await bd.varianteProducto.update({ where: { id: varianteId }, data: { stock: 1 } });
    expect(await procesarEventoPago(bd, evento(referencia, "APPROVED"))).toBe("revision-stock");
    expect((await pedido()).estado).toBe("REQUIERE_REVISION");
    expect(await stockDe(varianteId)).toBe(1);
  });

  it("RN5 · un pedido PAGADO no vuelve a rechazado", async () => {
    const { referencia } = await pedidoPendiente();
    await procesarEventoPago(bd, evento(referencia, "APPROVED"));
    expect(await procesarEventoPago(bd, evento(referencia, "DECLINED"))).toBe("repetido");
    expect((await pedido()).estado).toBe("PAGADO");
  });

  it("un aviso de una referencia desconocida se registra sin cambiar nada", async () => {
    const { varianteId } = await pedidoPendiente();
    expect(await procesarEventoPago(bd, evento("ZEN-20261122-ZZZZZ", "APPROVED"))).toBe(
      "pedido-desconocido",
    );
    expect(await stockDe(varianteId)).toBe(15);
    expect(await bd.eventoPago.count()).toBe(1);
  });
});
