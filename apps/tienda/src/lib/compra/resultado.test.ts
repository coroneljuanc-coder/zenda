import { describe, expect, it } from "vitest";
import { enmascararCelular, idPagoDeRegreso } from "./resultado";

describe("resultado del pago (ZTV-22)", () => {
  it("COM-04-CP5 · RN4 · enmascara el celular", () => {
    expect(enmascararCelular("3001234567")).toBe("300 *** 4567");
    expect(enmascararCelular("300 123 4567")).toBe("300 *** 4567");
    expect(enmascararCelular("123")).toBe("***");
  });

  it("toma el id del pago que agrega Mercado Pago al regresar, solo si es numérico", () => {
    expect(idPagoDeRegreso({ payment_id: "123456789" })).toBe("123456789");
    expect(idPagoDeRegreso({ collection_id: "987" })).toBe("987");
    expect(idPagoDeRegreso({ payment_id: "null" })).toBeNull();
    expect(idPagoDeRegreso({ payment_id: "1;DROP" })).toBeNull();
    expect(idPagoDeRegreso({})).toBeNull();
  });
});
