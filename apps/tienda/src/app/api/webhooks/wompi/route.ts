import { obtenerBD } from "@/lib/bd";
import {
  leerEvento,
  procesarEventoPago,
  registrarEventoRechazado,
  verificarChecksumWompi,
} from "@/lib/compra/pago";

/**
 * Webhook de Wompi (ZTV-21): Wompi avisa aquí el resultado de cada transacción. La respuesta no
 * expone datos del pedido. Wompi reintenta si no recibe 200, así que un aviso repetido se
 * procesa sin efectos dobles (RN4).
 */
export async function POST(peticion: Request): Promise<Response> {
  const secreto = process.env.WOMPI_SECRETO_EVENTOS?.trim();
  if (!secreto) {
    console.error("Webhook de Wompi sin WOMPI_SECRETO_EVENTOS configurado");
    // 503: Wompi lo reintentará cuando la configuración esté lista.
    return Response.json({ ok: false }, { status: 503 });
  }

  const bd = obtenerBD();
  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    cuerpo = null;
  }
  const evento = leerEvento(cuerpo);
  if (!evento) {
    await registrarEventoRechazado(bd, null, "forma-invalida");
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!verificarChecksumWompi(evento, secreto)) {
    // Escenario 3 / RN1: un aviso falso o alterado no cambia nada.
    await registrarEventoRechazado(bd, evento, "firma-invalida");
    return Response.json({ ok: false }, { status: 400 });
  }

  await procesarEventoPago(bd, evento);
  return Response.json({ ok: true });
}
