import { obtenerBD } from "../../../lib/bd";
import { recibirEvento } from "../../../lib/eventos";

/**
 * Entrada de eventos de la tienda (ZTV-25): `POST /api/eventos` con el evento «pedido.pagado»
 * firmado con la clave compartida ZENDA_SECRETO_EVENTOS (RN4). Responde «recibido» o el error,
 * nunca datos del pedido.
 */
export async function POST(peticion: Request): Promise<Response> {
  const secreto = process.env.ZENDA_SECRETO_EVENTOS?.trim();
  if (!secreto) {
    console.error("[ALERTA] Falta ZENDA_SECRETO_EVENTOS: no se pueden verificar los eventos");
    // 503: la tienda lo reintentará cuando la configuración esté lista.
    return Response.json({ estado: "sin-configurar" }, { status: 503 });
  }
  const cuerpo = await peticion.text();
  const r = await recibirEvento(
    obtenerBD(),
    { cuerpo, encabezados: peticion.headers },
    { secreto },
  );
  if (r.estado !== 200) {
    return Response.json({ estado: "rechazado" }, { status: r.estado });
  }
  return Response.json({ estado: "recibido" });
}
