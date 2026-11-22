// Pruebas de integración del aviso (webhook) de Mercado Pago (ZTV-86): base real y consulta simulada.
import { createHmac } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { atenderAvisoMercadoPago } from "./aviso-mercadopago";
import { guardarDatosEntrega } from "./entrega";
import type { PagoPasarela } from "./mercadopago";
import { crearPedido } from "./pedido";
import { DATOS_ANA, armarCarrito, bd, crearCamiseta, vaciar } from "./pruebas-bd";

const SECRETO = "secreto_webhook_integracion";

beforeEach(vaciar);
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

async function pedidoPendiente() {
  const varianteId = await crearCamiseta();
  const token = await armarCarrito(varianteId, 2);
  await guardarDatosEntrega(bd, { token, datos: DATOS_ANA });
  const r = await crearPedido(bd, { token, totalVisto: 111_800 });
  if (!r.ok) throw new Error(r.motivo);
  return { varianteId, referencia: r.pedido.referencia };
}

/** Aviso como lo envía Mercado Pago: `?data.id=…&type=payment` y la firma en los encabezados. */
function aviso(idPago: string, secreto = SECRETO, tipo = "payment") {
  const ts = "1764000000";
  const idSolicitud = "bb56a2f1-6aae-46ac-982e-9dcd3581d08e";
  const v1 = createHmac("sha256", secreto)
    .update(`id:${idPago};request-id:${idSolicitud};ts:${ts};`)
    .digest("hex");
  return {
    url: new URL(`https://tienda.test/api/webhooks/mercadopago?data.id=${idPago}&type=${tipo}`),
    encabezados: new Headers({ "x-signature": `ts=${ts},v1=${v1}`, "x-request-id": idSolicitud }),
    cuerpo: { action: "payment.updated", type: tipo, data: { id: idPago } },
  };
}

const aprobado = (referencia: string): PagoPasarela => ({
  proveedor: "mercadopago",
  id: "123456789",
  referencia,
  estado: "aprobado",
  estadoOriginal: "approved",
  monto: 111_800,
  moneda: "COP",
  metodo: "visa",
  real: false,
});

describe("aviso de Mercado Pago (ZTV-86)", () => {
  it("COM-07-CP2 · aviso firmado de un pago aprobado: 200, PAGADO y stock descontado", async () => {
    const { varianteId, referencia } = await pedidoPendiente();
    const consultados: string[] = [];
    const r = await atenderAvisoMercadoPago(bd, aviso("123456789"), {
      secreto: SECRETO,
      consultar: async (id) => {
        consultados.push(id);
        return aprobado(referencia);
      },
    });
    expect(r).toEqual({ estado: 200 });
    // RN3: el estado se consultó a Mercado Pago con el id del aviso.
    expect(consultados).toEqual(["123456789"]);
    expect((await bd.pedido.findFirstOrThrow()).estado).toBe("PAGADO");
    expect((await bd.varianteProducto.findUniqueOrThrow({ where: { id: varianteId } })).stock).toBe(
      13,
    );
  });

  it("COM-07-CP3 · firma de otra clave: 400, no consulta nada y el pedido no cambia", async () => {
    const { referencia } = await pedidoPendiente();
    let consultas = 0;
    const r = await atenderAvisoMercadoPago(bd, aviso("123456789", "clave_falsa"), {
      secreto: SECRETO,
      consultar: async () => {
        consultas++;
        return aprobado(referencia);
      },
    });
    expect(r).toEqual({ estado: 400 });
    expect(consultas).toBe(0);
    expect((await bd.pedido.findFirstOrThrow()).estado).toBe("PENDIENTE_PAGO");
    expect(await bd.eventoPago.findFirstOrThrow()).toMatchObject({ resultado: "firma-invalida" });
  });

  it("un aviso firmado que no es de un pago se responde 200 sin hacer nada", async () => {
    await pedidoPendiente();
    const r = await atenderAvisoMercadoPago(bd, aviso("777", SECRETO, "merchant_order"), {
      secreto: SECRETO,
      consultar: async () => {
        throw new Error("no debía consultar");
      },
    });
    expect(r).toEqual({ estado: 200 });
    expect((await bd.pedido.findFirstOrThrow()).estado).toBe("PENDIENTE_PAGO");
  });

  it("si Mercado Pago no responde a la consulta: 502 para que reintente", async () => {
    await pedidoPendiente();
    const r = await atenderAvisoMercadoPago(bd, aviso("123456789"), {
      secreto: SECRETO,
      consultar: async () => null,
    });
    expect(r).toEqual({ estado: 502 });
    expect((await bd.pedido.findFirstOrThrow()).estado).toBe("PENDIENTE_PAGO");
  });
});
