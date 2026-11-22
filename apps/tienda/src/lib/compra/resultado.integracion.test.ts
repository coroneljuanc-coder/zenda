// Pruebas de integración del resultado del pago (ZTV-22): base real, Mercado Pago simulado.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { guardarDatosEntrega } from "./entrega";
import type { EstadoPasarela, PagoPasarela } from "./mercadopago";
import { crearPedido } from "./pedido";
import { DATOS_ANA, armarCarrito, bd, crearCamiseta, vaciar } from "./pruebas-bd";
import { consultarResultado } from "./resultado";

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
  return r.pedido;
}

const pago = (referencia: string, estado: EstadoPasarela): PagoPasarela => ({
  proveedor: "mercadopago",
  id: "555",
  referencia,
  estado,
  estadoOriginal: estado === "aprobado" ? "approved" : "in_process",
  monto: 111_800,
  moneda: "COP",
  metodo: "visa",
});

describe("consultarResultado (ZTV-22)", () => {
  it("COM-04-CP4 · RN1 · con un token que no coincide no devuelve nada", async () => {
    const p = await pedidoPendiente();
    expect(
      await consultarResultado(bd, { referencia: p.referencia, token: "otro", idPago: null }, null),
    ).toBeNull();
  });

  it("COM-04-CP6 · RN2 · aviso no recibido + Mercado Pago dice aprobado: el pedido pasa a PAGADO", async () => {
    const p = await pedidoPendiente();
    const consultados: string[] = [];
    const r = await consultarResultado(
      bd,
      { referencia: p.referencia, token: p.tokenAcceso, idPago: "555" },
      async (id) => {
        consultados.push(id);
        return pago(p.referencia, "aprobado");
      },
    );
    expect(consultados).toEqual(["555"]);
    expect(r).toMatchObject({ actualizado: true, pedido: { estado: "PAGADO", total: 111_800 } });
    expect(r?.pedido.lineas).toHaveLength(1);
    // El respaldo aplica las mismas reglas: deja el evento para los correos (ZTV-25).
    expect(await bd.eventoSaliente.count()).toBe(1);
  });

  it("COM-04-CP2 · Mercado Pago dice pendiente: el pedido sigue pendiente", async () => {
    const p = await pedidoPendiente();
    const r = await consultarResultado(
      bd,
      { referencia: p.referencia, token: p.tokenAcceso, idPago: "555" },
      async () => pago(p.referencia, "pendiente"),
    );
    expect(r).toMatchObject({ actualizado: false, pedido: { estado: "PENDIENTE_PAGO" } });
  });

  it("un id de pago de otro pedido no se aplica", async () => {
    const p = await pedidoPendiente();
    const r = await consultarResultado(
      bd,
      { referencia: p.referencia, token: p.tokenAcceso, idPago: "555" },
      async () => pago("ZEN-20261123-OTROO", "aprobado"),
    );
    expect(r?.pedido.estado).toBe("PENDIENTE_PAGO");
  });

  it("un pedido ya pagado no se vuelve a consultar", async () => {
    const p = await pedidoPendiente();
    await bd.pedido.update({ where: { id: p.id }, data: { estado: "PAGADO" } });
    let consultas = 0;
    await consultarResultado(
      bd,
      { referencia: p.referencia, token: p.tokenAcceso, idPago: "555" },
      async () => {
        consultas++;
        return null;
      },
    );
    expect(consultas).toBe(0);
  });
});
