import { after } from "next/server";
import { obtenerBD } from "@/lib/bd";
import { entregarEventosPendientes, leerConfigEventos } from "@/lib/eventos/bandeja";
import { atenderAvisoMercadoPago } from "@/lib/compra/aviso-mercadopago";
import { consultarPago, leerConfigMercadoPago } from "@/lib/compra/mercadopago";

/**
 * Webhook de Mercado Pago (ZTV-86): Mercado Pago avisa aquí cada cambio de un pago. Se verifica la
 * firma si hay clave secreta (opcional desde ZTV-90), se consulta el pago con la credencial privada
 * y se aplica (reglas de ZTV-21). Un aviso repetido no tiene efectos dobles. La respuesta no expone
 * datos del pedido.
 */
export async function POST(peticion: Request): Promise<Response> {
  const secreto = process.env.MERCADOPAGO_SECRETO_WEBHOOK?.trim() || null;
  const config = leerConfigMercadoPago();
  if (!config) {
    console.error("Webhook de Mercado Pago sin credenciales configuradas");
    // 503: Mercado Pago lo reintentará cuando la configuración esté lista.
    return Response.json({ ok: false }, { status: 503 });
  }

  let cuerpo: unknown = null;
  try {
    cuerpo = await peticion.json();
  } catch {
    cuerpo = null;
  }
  const { estado } = await atenderAvisoMercadoPago(
    obtenerBD(),
    { url: new URL(peticion.url), encabezados: peticion.headers, cuerpo },
    { secreto, consultar: (id) => consultarPago(config, id) },
  );
  // ZTV-25 (RN2): después de responder, se intenta entregar el evento «pedido.pagado» al servicio
  // de Notificaciones. Si falla, queda pendiente y lo reintenta la tarea programada.
  const configEventos = leerConfigEventos();
  if (estado === 200 && configEventos) {
    after(async () => {
      await entregarEventosPendientes(obtenerBD(), configEventos);
    });
  }
  return Response.json({ ok: estado === 200 }, { status: estado });
}
