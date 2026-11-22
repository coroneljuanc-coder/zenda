// Pruebas de integración de la confirmación del pago (ZTV-21, con Mercado Pago desde ZTV-86).
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { guardarDatosEntrega } from "./entrega";
import { type EstadoPasarela, type PagoPasarela } from "./mercadopago";
import { procesarPago } from "./pago";
import { crearPedido } from "./pedido";
import { DATOS_ANA, armarCarrito, bd, crearCamiseta, vaciar } from "./pruebas-bd";

beforeEach(vaciar);
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

/** Pedido pendiente de 2 × Camiseta M / Negro (stock 15): $ 99.800 + envío = $ 111.800. */
async function pedidoPendiente() {
  const varianteId = await crearCamiseta();
  const token = await armarCarrito(varianteId, 2);
  await guardarDatosEntrega(bd, { token, datos: DATOS_ANA });
  const r = await crearPedido(bd, { token, totalVisto: 111_800 });
  if (!r.ok) throw new Error(r.motivo);
  return { varianteId, token, referencia: r.pedido.referencia };
}

const ORIGINAL: Record<EstadoPasarela, string> = {
  aprobado: "approved",
  rechazado: "rejected",
  pendiente: "in_process",
  otro: "refunded",
};

function pago(referencia: string, estado: EstadoPasarela, monto = 111_800): PagoPasarela {
  return {
    proveedor: "mercadopago",
    id: `pago-${estado}`,
    referencia,
    estado,
    estadoOriginal: ORIGINAL[estado],
    monto,
    moneda: "COP",
    metodo: "visa",
    real: false,
  };
}

const stockDe = async (id: string) =>
  (await bd.varianteProducto.findUniqueOrThrow({ where: { id } })).stock;
const pedido = () => bd.pedido.findFirstOrThrow({ orderBy: { creadoEn: "desc" } });

describe("confirmar el pago (ZTV-21 con Mercado Pago)", () => {
  it("COM-03-CP1 · aprobado: pedido PAGADO, stock 15 → 13 y carrito vacío (RN2, RN6)", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    expect(await procesarPago(bd, pago(referencia, "aprobado"))).toBe("pagado");
    expect(await pedido()).toMatchObject({
      estado: "PAGADO",
      pasarelaTransaccionId: "pago-aprobado",
      metodoPago: "visa",
    });
    expect((await pedido()).pagadoEn).toBeInstanceOf(Date);
    expect(await stockDe(varianteId)).toBe(13);
    expect(await bd.lineaCarrito.count()).toBe(0);
    expect(await bd.eventoPago.findFirstOrThrow()).toMatchObject({
      proveedor: "mercadopago",
      referencia,
      estado: "approved",
      resultado: "pagado",
    });
  });

  it("COM-03-CP2 · rechazado: PAGO_RECHAZADO, stock y carrito intactos", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    expect(await procesarPago(bd, pago(referencia, "rechazado"))).toBe("rechazado");
    expect((await pedido()).estado).toBe("PAGO_RECHAZADO");
    expect(await stockDe(varianteId)).toBe(15);
    expect(await bd.lineaCarrito.count()).toBe(1);
  });

  it("pendiente o reembolsado no cambian el pedido", async () => {
    const { referencia } = await pedidoPendiente();
    expect(await procesarPago(bd, pago(referencia, "pendiente"))).toBe("pendiente");
    expect(await procesarPago(bd, pago(referencia, "otro"))).toBe("ignorado");
    expect((await pedido()).estado).toBe("PENDIENTE_PAGO");
  });

  it("COM-03-CP4 · monto 1 peso distinto: REQUIERE_REVISION y stock intacto", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    expect(await procesarPago(bd, pago(referencia, "aprobado", 111_801))).toBe("revision-monto");
    expect((await pedido()).estado).toBe("REQUIERE_REVISION");
    expect(await stockDe(varianteId)).toBe(15);
  });

  it("COM-03-CP5 · el mismo aprobado tres veces descuenta el stock una sola vez (RN4)", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    const resultados = [];
    for (let i = 0; i < 3; i++)
      resultados.push(await procesarPago(bd, pago(referencia, "aprobado")));
    expect(resultados).toEqual(["pagado", "repetido", "repetido"]);
    expect(await stockDe(varianteId)).toBe(13);
    expect(await bd.eventoPago.count()).toBe(3);
  });

  it("RN4 · tres aprobados simultáneos también descuentan una sola vez", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    const resultados = await Promise.all(
      [1, 2, 3].map(() => procesarPago(bd, pago(referencia, "aprobado"))),
    );
    expect(resultados.filter((r) => r === "pagado")).toHaveLength(1);
    expect(await stockDe(varianteId)).toBe(13);
  });

  it("COM-03-CP6 · stock 1 y pedido de 2: REQUIERE_REVISION y el stock no queda negativo (RN3)", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    await bd.varianteProducto.update({ where: { id: varianteId }, data: { stock: 1 } });
    expect(await procesarPago(bd, pago(referencia, "aprobado"))).toBe("revision-stock");
    expect((await pedido()).estado).toBe("REQUIERE_REVISION");
    expect(await stockDe(varianteId)).toBe(1);
  });

  it("ZTV-89 · un pago real aprobado queda en REQUIERE_REVISION, sin tocar stock ni carrito", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    const real = { ...pago(referencia, "aprobado"), real: true };
    expect(await procesarPago(bd, real)).toBe("revision-pago-real");
    expect((await pedido()).estado).toBe("REQUIERE_REVISION");
    expect(await stockDe(varianteId)).toBe(15);
    expect(await bd.lineaCarrito.count()).toBe(1);
    expect((await bd.eventoPago.findFirstOrThrow()).resultado).toBe("revision-pago-real");
  });

  it("RN5 · un pedido PAGADO no vuelve a rechazado", async () => {
    const { referencia } = await pedidoPendiente();
    await procesarPago(bd, pago(referencia, "aprobado"));
    expect(await procesarPago(bd, pago(referencia, "rechazado"))).toBe("repetido");
    expect((await pedido()).estado).toBe("PAGADO");
  });

  it("un pago de una referencia desconocida se registra sin cambiar nada", async () => {
    const { varianteId } = await pedidoPendiente();
    expect(await procesarPago(bd, pago("ZEN-20261122-ZZZZZ", "aprobado"))).toBe(
      "pedido-desconocido",
    );
    expect(await stockDe(varianteId)).toBe(15);
    expect(await bd.eventoPago.count()).toBe(1);
  });
});
