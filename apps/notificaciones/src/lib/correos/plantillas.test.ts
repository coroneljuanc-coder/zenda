import { EVENTO_PEDIDO_PAGADO_EJEMPLO as EVENTO } from "@zenda/contratos";
import { describe, expect, it } from "vitest";
import {
  NOTA_PRUEBAS,
  avisoModoPruebas,
  correoAvisoVendedor,
  correoConfirmacionCliente,
  pesos,
} from "./plantillas";

const datos = EVENTO.datos;

describe("plantillas de los correos de compra (ZTV-23)", () => {
  it("formatea pesos colombianos como la tienda", () => {
    expect(pesos(161_700)).toBe("$ 161.700");
    expect(pesos(12_000)).toBe("$ 12.000");
  });

  it("COM-05-CP6 · confirmación con los montos de la copia del pedido (seed: 3 × $ 49.900 + envío $ 12.000)", () => {
    const c = correoConfirmacionCliente(datos);
    expect(c.asunto).toBe("Confirmación de tu pedido ZEN-20261123-7K3QD en Zenda");
    for (const parte of [c.html, c.texto]) {
      expect(parte).toContain("¡Hola, Ana! Recibimos tu pago.");
      expect(parte).toContain("Camiseta básica de algodón (M / Negro)");
      expect(parte).toContain("3 × $ 49.900");
      expect(parte).toContain("$ 149.700");
      expect(parte).toContain("$ 12.000");
      expect(parte).toContain("$ 161.700");
      expect(parte).toContain("Cra 1 # 2-3");
      expect(parte).toContain("ZEN-20261123-7K3QD");
      expect(parte).toContain(NOTA_PRUEBAS); // RN4
    }
  });

  it("envío gratis desde $ 200.000 se muestra como «Gratis»", () => {
    const c = correoConfirmacionCliente({ ...datos, envio: 0, total: 149_700 });
    expect(c.texto).toContain("Envío: Gratis");
  });

  it("en modo de pruebas dice a quién iba dirigido", () => {
    const c = correoConfirmacionCliente(datos, avisoModoPruebas("ana@ejemplo.com"));
    expect(c.texto.startsWith("Para: ana@ejemplo.com (modo de pruebas)")).toBe(true);
    expect(c.html).toContain("Para: ana@ejemplo.com (modo de pruebas)");
  });

  it("COM-05-CP3 · aviso al vendedor con asunto, contacto y entrega", () => {
    const c = correoAvisoVendedor(datos);
    expect(c.asunto).toBe("Nuevo pedido pagado: ZEN-20261123-7K3QD – $ 161.700");
    for (const parte of [c.html, c.texto]) {
      expect(parte).toContain("Ana Prueba");
      expect(parte).toContain("ana@ejemplo.com");
      expect(parte).toContain("3001234567");
      expect(parte).toContain("Medellín, Antioquia");
    }
  });

  it("escapa el HTML de los datos del cliente", () => {
    const c = correoConfirmacionCliente({
      ...datos,
      cliente: { ...datos.cliente, nombre: "<b>Ana</b> Prueba" },
    });
    expect(c.html).toContain("&lt;b&gt;Ana&lt;/b&gt;");
    expect(c.html).not.toContain("<b>Ana</b>");
  });
});
