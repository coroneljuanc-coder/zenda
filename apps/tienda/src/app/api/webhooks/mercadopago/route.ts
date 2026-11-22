import { obtenerBD } from "@/lib/bd";
import { atenderAvisoMercadoPago } from "@/lib/compra/aviso-mercadopago";
import { consultarPago, leerConfigMercadoPago } from "@/lib/compra/mercadopago";

/**
 * Webhook de Mercado Pago (ZTV-86): Mercado Pago avisa aquí cada cambio de un pago. Se verifica la
 * firma, se consulta el pago con la credencial privada y se aplica (reglas de ZTV-21). Un aviso
 * repetido no tiene efectos dobles. La respuesta no expone datos del pedido.
 */
export async function POST(peticion: Request): Promise<Response> {
  const secreto = process.env.MERCADOPAGO_SECRETO_WEBHOOK?.trim();
  const config = leerConfigMercadoPago();
  if (!secreto || !config) {
    console.error(
      "Webhook de Mercado Pago sin credenciales de prueba o sin clave secreta configuradas",
    );
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
  return Response.json({ ok: estado === 200 }, { status: estado });
}
