import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Contrato del evento «pedido.pagado» (ZTV-25): la tienda lo publica cuando un pedido queda
 * «Pagado» y el servicio de Notificaciones lo recibe para enviar los correos (ZTV-23).
 * RN3: cada evento lleva id único, tipo, versión del contrato y fecha.
 * RN5: solo los datos que necesitan los correos; nunca datos de pago.
 */
export const TIPO_PEDIDO_PAGADO = "pedido.pagado";
export const VERSION_PEDIDO_PAGADO = 1;

/** Encabezado con la firma del evento: `t=<segundos>,v1=<hmac hex>` (RN4). */
export const ENCABEZADO_FIRMA = "x-zenda-firma";

/** Antigüedad máxima de una firma: 5 minutos (escenario 3 de ZTV-25). */
export const TOLERANCIA_FIRMA_SEGUNDOS = 300;

const pesos = z.number().int().nonnegative();

export const EsquemaLineaEvento = z.object({
  nombreProducto: z.string().min(1),
  descripcionVariante: z.string().nullable(),
  precioUnitario: pesos,
  cantidad: z.number().int().positive(),
  totalLinea: pesos,
});

export const EsquemaDatosPedidoPagado = z.object({
  referencia: z.string().min(1),
  cliente: z.object({
    nombre: z.string().min(1),
    correo: z.email(),
    celular: z.string().min(1),
  }),
  entrega: z.object({
    departamento: z.string().min(1),
    ciudad: z.string().min(1),
    direccion: z.string().min(1),
    detalles: z.string().nullable(),
    notas: z.string().nullable(),
  }),
  lineas: z.array(EsquemaLineaEvento).min(1),
  subtotal: pesos,
  envio: pesos,
  total: pesos,
  /** Método informado por la pasarela (ej. «visa»), nunca datos de la tarjeta. */
  metodoPago: z.string().nullable(),
  pagadoEn: z.iso.datetime(),
});

export const EsquemaEventoPedidoPagado = z.object({
  id: z.uuid(),
  tipo: z.literal(TIPO_PEDIDO_PAGADO),
  version: z.literal(VERSION_PEDIDO_PAGADO),
  ocurridoEn: z.iso.datetime(),
  datos: EsquemaDatosPedidoPagado,
});

export type DatosPedidoPagado = z.infer<typeof EsquemaDatosPedidoPagado>;
export type EventoPedidoPagado = z.infer<typeof EsquemaEventoPedidoPagado>;

function hmac(cuerpo: string, segundos: number, secreto: string): string {
  return createHmac("sha256", secreto).update(`${segundos}.${cuerpo}`).digest("hex");
}

/** Firma el cuerpo exacto que se envía (RN4). `ahora` permite probar con un reloj fijo. */
export function firmarEvento(cuerpo: string, secreto: string, ahora = new Date()): string {
  const segundos = Math.floor(ahora.getTime() / 1000);
  return `t=${segundos},v1=${hmac(cuerpo, segundos, secreto)}`;
}

export type ResultadoFirma = "valida" | "invalida" | "vencida";

/** Verifica la firma en tiempo constante y su antigüedad (escenario 3 de ZTV-25). */
export function verificarFirmaEvento(
  cuerpo: string,
  encabezado: string | null,
  secreto: string,
  ahora = new Date(),
): ResultadoFirma {
  if (!encabezado) return "invalida";
  const partes = Object.fromEntries(
    encabezado.split(",").map((p) => {
      const [clave, ...valor] = p.split("=");
      return [clave.trim(), valor.join("=").trim()];
    }),
  );
  const segundos = Number(partes.t);
  const v1 = partes.v1?.toLowerCase();
  if (!Number.isInteger(segundos) || !v1) return "invalida";
  const esperado = hmac(cuerpo, segundos, secreto);
  const coincide =
    v1.length === esperado.length && timingSafeEqual(Buffer.from(v1), Buffer.from(esperado));
  if (!coincide) return "invalida";
  const antiguedad = Math.abs(Math.floor(ahora.getTime() / 1000) - segundos);
  return antiguedad > TOLERANCIA_FIRMA_SEGUNDOS ? "vencida" : "valida";
}
