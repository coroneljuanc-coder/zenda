import type { PrismaClient } from "@/generated/prisma/client";
import { type PagoPasarela, verificarFirmaAviso } from "./mercadopago";
import { procesarPago, registrarAvisoRechazado } from "./pago";

/**
 * Atiende un aviso (webhook) de Mercado Pago (ZTV-86). Separado de la ruta para poder probarlo
 * con una base real y una consulta de pagos simulada.
 * - Con clave secreta configurada, firma inválida o ausente: 400 y nada cambia (escenario 3).
 * - Sin clave secreta (ZTV-90): no se verifica la firma. Es seguro porque el aviso nunca se cree:
 *   el pago siempre se consulta a Mercado Pago con la credencial privada (RN3). Los pagos de prueba
 *   los cobra el vendedor de prueba que crea Mercado Pago, cuyos avisos no se pueden firmar con la
 *   clave de la aplicación.
 * - Aviso que no es de un pago: 200 sin hacer nada (Mercado Pago no reintenta).
 * - No se pudo consultar el pago: 502, para que Mercado Pago reintente más tarde.
 * La respuesta nunca incluye datos del pedido.
 */
export async function atenderAvisoMercadoPago(
  bd: PrismaClient,
  { url, encabezados, cuerpo }: { url: URL; encabezados: Headers; cuerpo: unknown },
  {
    secreto,
    consultar,
  }: { secreto: string | null; consultar: (idPago: string) => Promise<PagoPasarela | null> },
): Promise<{ estado: number }> {
  const datos = (cuerpo ?? {}) as { type?: unknown; data?: { id?: unknown } };
  const tipo = url.searchParams.get("type") ?? (typeof datos.type === "string" ? datos.type : null);
  const idPago =
    url.searchParams.get("data.id") ??
    (datos.data && (typeof datos.data.id === "string" || typeof datos.data.id === "number")
      ? String(datos.data.id)
      : null);

  const firmaValida =
    !secreto ||
    verificarFirmaAviso(
      {
        firma: encabezados.get("x-signature"),
        idSolicitud: encabezados.get("x-request-id"),
        idDato: idPago,
      },
      secreto,
    );
  if (!firmaValida) {
    await registrarAvisoRechazado(bd, { transaccionId: idPago, resultado: "firma-invalida" });
    return { estado: 400 };
  }
  if (tipo !== "payment" || !idPago) return { estado: 200 };

  const pago = await consultar(idPago);
  if (!pago) {
    await registrarAvisoRechazado(bd, { transaccionId: idPago, resultado: "pago-no-consultado" });
    return { estado: 502 };
  }
  await procesarPago(bd, pago);
  return { estado: 200 };
}
