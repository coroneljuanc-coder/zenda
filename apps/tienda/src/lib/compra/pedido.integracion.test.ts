// Pruebas de integración de la creación del pedido (ZTV-20): usan PostgreSQL real.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { guardarDatosEntrega } from "./entrega";
import { cancelarPedido, crearPedido } from "./pedido";
import { DATOS_ANA, armarCarrito, bd, crearCamiseta, vaciar } from "./pruebas-bd";

beforeEach(vaciar);
afterAll(async () => {
  await vaciar();
  await bd.$disconnect();
});

/** 3 × Camiseta M / Negro ($ 149.700 + envío $ 12.000 = $ 161.700) con los datos de Ana. */
async function listoParaPagar() {
  const varianteId = await crearCamiseta();
  const token = await armarCarrito(varianteId, 3);
  await guardarDatosEntrega(bd, { token, datos: DATOS_ANA });
  return { varianteId, token };
}

describe("crear el pedido (ZTV-20)", () => {
  it("COM-02-CP1 · pedido PENDIENTE_PAGO con copia de las líneas, totales y datos (RN2, RN5)", async () => {
    const { varianteId, token } = await listoParaPagar();
    const r = await crearPedido(bd, { token, totalVisto: 161_700 });
    expect(r.ok).toBe(true);

    const pedido = await bd.pedido.findFirstOrThrow({ include: { lineas: true } });
    expect(pedido).toMatchObject({
      estado: "PENDIENTE_PAGO",
      subtotal: 149_700,
      envio: 12_000,
      total: 161_700,
      nombreCompleto: "Ana Prueba",
      correo: "ana@ejemplo.com",
      ciudad: "Medellín",
      departamento: "Antioquia",
      codigoDane: "05001",
    });
    expect(pedido.referencia).toMatch(/^ZEN-\d{8}-[A-Z0-9]{5}$/);
    expect(pedido.lineas).toEqual([
      expect.objectContaining({
        varianteId,
        nombreProducto: "Camiseta básica de algodón",
        descripcionVariante: "M / Negro",
        precioUnitario: 49_900,
        cantidad: 3,
        totalLinea: 149_700,
      }),
    ]);
    // RN5: no descuenta inventario ni vacía el carrito.
    expect((await bd.varianteProducto.findUniqueOrThrow({ where: { id: varianteId } })).stock).toBe(
      15,
    );
    expect(await bd.lineaCarrito.count()).toBe(1);

    // RN2: un cambio posterior del catálogo no altera el pedido.
    await bd.producto.updateMany({ data: { precio: 59_900 } });
    expect((await bd.lineaPedido.findFirstOrThrow()).precioUnitario).toBe(49_900);
  });

  it("COM-02-CP4 · si el precio cambió entre el resumen y «Pagar», no crea el pedido", async () => {
    const { token } = await listoParaPagar();
    await bd.producto.updateMany({ data: { precio: 54_900 } });
    expect(await crearPedido(bd, { token, totalVisto: 161_700 })).toEqual({
      ok: false,
      motivo: "catalogo-cambio",
    });
    expect(await bd.pedido.count()).toBe(0);
    // El aviso de precio queda para cuando el cliente vuelva al carrito.
    expect((await bd.lineaCarrito.findFirstOrThrow()).precioVisto).toBe(49_900);
  });

  it("COM-02-CP4 · si bajó el stock por debajo de lo pedido, tampoco", async () => {
    const { varianteId, token } = await listoParaPagar();
    await bd.varianteProducto.update({ where: { id: varianteId }, data: { stock: 2 } });
    expect(await crearPedido(bd, { token, totalVisto: 161_700 })).toMatchObject({
      ok: false,
      motivo: "catalogo-cambio",
    });
    expect(await bd.pedido.count()).toBe(0);
  });

  it("COM-02-CP5 · si Wompi no responde, el pedido queda CANCELADO y el carrito intacto", async () => {
    const { token } = await listoParaPagar();
    const r = await crearPedido(bd, { token, totalVisto: 161_700 });
    if (!r.ok) throw new Error("debía crear el pedido");
    await cancelarPedido(bd, r.pedido.id);
    expect((await bd.pedido.findUniqueOrThrow({ where: { id: r.pedido.id } })).estado).toBe(
      "CANCELADO",
    );
    expect(await bd.lineaCarrito.count()).toBe(1);
  });

  it("COM-02-CP6 · dos «Pagar» a la vez dejan un solo pedido pendiente", async () => {
    const { token } = await listoParaPagar();
    const [a, b] = await Promise.all([
      crearPedido(bd, { token, totalVisto: 161_700 }),
      crearPedido(bd, { token, totalVisto: 161_700 }),
    ]);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.pedido.referencia).toBe(b.pedido.referencia);
    expect(await bd.pedido.count()).toBe(1);
  });

  it("RN6 · con otro contenido, el pedido pendiente anterior se cancela", async () => {
    const { varianteId, token } = await listoParaPagar();
    const primero = await crearPedido(bd, { token, totalVisto: 161_700 });
    await bd.lineaCarrito.updateMany({ where: { varianteId }, data: { cantidad: 2 } });
    const segundo = await crearPedido(bd, { token, totalVisto: 111_800 });
    expect(primero.ok && segundo.ok).toBe(true);
    const estados = await bd.pedido.findMany({
      select: { estado: true, total: true },
      orderBy: { creadoEn: "asc" },
    });
    expect(estados).toEqual([
      { estado: "CANCELADO", total: 161_700 },
      { estado: "PENDIENTE_PAGO", total: 111_800 },
    ]);
  });

  it("RN6 · el mismo contenido pasados 2 minutos crea un pedido nuevo y cancela el anterior", async () => {
    const { token } = await listoParaPagar();
    const ahora = new Date();
    await crearPedido(bd, { token, totalVisto: 161_700, ahora });
    const despues = new Date(ahora.getTime() + 3 * 60 * 1000);
    await crearPedido(bd, { token, totalVisto: 161_700, ahora: despues });
    expect(await bd.pedido.count({ where: { estado: "PENDIENTE_PAGO" } })).toBe(1);
    expect(await bd.pedido.count({ where: { estado: "CANCELADO" } })).toBe(1);
  });

  it("RN3 · si la referencia aleatoria ya existe, genera otra", async () => {
    const { token } = await listoParaPagar();
    const ahora = new Date();
    await crearPedido(bd, {
      token,
      totalVisto: 161_700,
      ahora,
      referencia: () => "ZEN-20261122-AAAAA",
    });
    await bd.lineaCarrito.updateMany({ data: { cantidad: 2 } });
    const repetidas = ["ZEN-20261122-AAAAA", "ZEN-20261122-BBBBB"];
    const r = await crearPedido(bd, {
      token,
      totalVisto: 111_800,
      ahora,
      referencia: () => repetidas.shift() ?? "ZEN-20261122-CCCCC",
    });
    expect(r.ok && r.pedido.referencia).toBe("ZEN-20261122-BBBBB");
  });

  it("sin datos de envío o sin carrito no hay pedido", async () => {
    const token = await armarCarrito(await crearCamiseta(), 3);
    expect(await crearPedido(bd, { token, totalVisto: 161_700 })).toEqual({
      ok: false,
      motivo: "sin-datos",
    });
    expect(await crearPedido(bd, { token: undefined, totalVisto: 161_700 })).toEqual({
      ok: false,
      motivo: "sin-carrito",
    });
    expect(await bd.pedido.count()).toBe(0);
  });
});
