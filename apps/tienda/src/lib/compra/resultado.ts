import type { PrismaClient } from "@/generated/prisma/client";
import type { PagoPasarela } from "./mercadopago";
import { procesarPago } from "./pago";

/**
 * Resultado del pago para el cliente (ZTV-22).
 * - RN1: el pedido solo se muestra si la referencia y el token de acceso coinciden.
 * - RN2: si el pedido sigue «Pendiente de pago» pero Mercado Pago devolvió el id del pago, Zenda
 *   lo consulta con su credencial privada y lo aplica con las mismas reglas del aviso (ZTV-21).
 *   Así el resultado es correcto aunque el aviso se demore.
 * - RN4: el celular se muestra enmascarado.
 */

/** RN4: «3001234567» → «300 *** 4567». */
export function enmascararCelular(celular: string): string {
  const digitos = celular.replace(/\D/g, "");
  if (digitos.length < 7) return "***";
  return `${digitos.slice(0, 3)} *** ${digitos.slice(-4)}`;
}

/** Id del pago que Mercado Pago agrega al regresar: `payment_id` o `collection_id`. */
export function idPagoDeRegreso(
  parametros: Record<string, string | string[] | undefined>,
): string | null {
  for (const nombre of ["payment_id", "collection_id"]) {
    const valor = parametros[nombre];
    if (typeof valor === "string" && /^\d{1,20}$/.test(valor)) return valor;
  }
  return null;
}

const seleccion = {
  referencia: true,
  estado: true,
  subtotal: true,
  envio: true,
  total: true,
  nombreCompleto: true,
  correo: true,
  celular: true,
  departamento: true,
  ciudad: true,
  direccion: true,
  detalles: true,
  lineas: {
    select: {
      nombreProducto: true,
      descripcionVariante: true,
      precioUnitario: true,
      cantidad: true,
      totalLinea: true,
    },
    orderBy: { id: "asc" as const },
  },
};

export type PedidoResultado = NonNullable<Awaited<ReturnType<typeof leerPedido>>>;

function leerPedido(bd: PrismaClient, referencia: string, token: string) {
  return bd.pedido.findFirst({ where: { referencia, tokenAcceso: token }, select: seleccion });
}

/**
 * Lee el pedido para la página de resultado (RN1) y, si sigue pendiente y hay un id de pago,
 * hace la consulta de respaldo (RN2). Devuelve `null` si la referencia y el token no coinciden.
 */
export async function consultarResultado(
  bd: PrismaClient,
  { referencia, token, idPago }: { referencia: string; token: string; idPago: string | null },
  consultar: ((idPago: string) => Promise<PagoPasarela | null>) | null,
): Promise<{ pedido: PedidoResultado; actualizado: boolean } | null> {
  const pedido = await leerPedido(bd, referencia, token);
  if (!pedido) return null;
  if (pedido.estado !== "PENDIENTE_PAGO" || !idPago || !consultar) {
    return { pedido, actualizado: false };
  }
  const pago = await consultar(idPago);
  // Solo se aplica un pago de este mismo pedido: el id de la URL podría ser de otro.
  if (!pago || pago.referencia !== referencia) return { pedido, actualizado: false };
  const resultado = await procesarPago(bd, pago);
  if (resultado === "pendiente" || resultado === "ignorado") return { pedido, actualizado: false };
  const nuevo = await leerPedido(bd, referencia, token);
  return nuevo ? { pedido: nuevo, actualizado: true } : null;
}
