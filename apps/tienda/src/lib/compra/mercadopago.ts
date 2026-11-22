import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Integración con Mercado Pago, Checkout Pro (ZTV-86, decisión D1 actualizada el 2026-11-22).
 * Zenda nunca ve ni guarda datos de tarjetas: el cliente paga en la página de Mercado Pago y Mercado
 * Pago avisa por webhook. Las credenciales viven solo en variables de entorno del servidor.
 */

export const URL_API = "https://api.mercadopago.com";
export const MONEDA = "COP";

export type ConfigMercadoPago = { accessToken: string; urlApi: string };

const PREFIJOS_TOKEN = ["TEST-", "APP_USR-"];

/**
 * RN1 de ZTV-86, ajustada en ZTV-89: Mercado Pago entrega hoy las credenciales de prueba con el
 * prefijo `APP_USR-` (antes `TEST-`), igual que las de producción, así que el prefijo ya no separa
 * prueba de producción. Se aceptan ambos prefijos y la regla «solo pruebas» se protege al confirmar
 * el pago: un pago real nunca queda «Pagado» (ver `procesarPago`). Devuelve `null` si falta la
 * credencial o no tiene la forma de una de Mercado Pago.
 */
export function leerConfigMercadoPago(
  entorno: Record<string, string | undefined> = process.env,
): ConfigMercadoPago | null {
  const accessToken = entorno.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken || !PREFIJOS_TOKEN.some((p) => accessToken.startsWith(p))) return null;
  return { accessToken, urlApi: entorno.MERCADOPAGO_URL_API?.trim() || URL_API };
}

export type LineaParaPagar = {
  varianteId: string;
  nombreProducto: string;
  descripcionVariante: string | null;
  precioUnitario: number;
  cantidad: number;
};

export type DatosOrdenPago = {
  referencia: string;
  lineas: LineaParaPagar[];
  envio: number;
  /** Dirección pública de la tienda en esta petición (https://…). */
  urlBase: string;
  /** Token de acceso del pedido, para la página de regreso. */
  tokenAcceso: string;
  /** Si Vercel protege el ambiente, el permiso para automatizaciones que deja pasar el aviso. */
  permisoVercel?: string;
};

/**
 * RN2: arma la orden de pago (preferencia) con la copia del pedido: productos, envío y referencia.
 * El aviso (`notification_url`) y el regreso automático solo se configuran con una dirección
 * pública https; en el computador de desarrollo no aplican.
 */
export function cuerpoPreferencia(datos: DatosOrdenPago) {
  const regreso = new URL("/pedido/resultado", datos.urlBase);
  regreso.searchParams.set("ref", datos.referencia);
  regreso.searchParams.set("t", datos.tokenAcceso);
  const publica = datos.urlBase.startsWith("https://");

  const aviso = new URL("/api/webhooks/mercadopago", datos.urlBase);
  if (datos.permisoVercel)
    aviso.searchParams.set("x-vercel-protection-bypass", datos.permisoVercel);

  const items = datos.lineas.map((l) => ({
    id: l.varianteId,
    title: l.descripcionVariante
      ? `${l.nombreProducto} (${l.descripcionVariante})`
      : l.nombreProducto,
    quantity: l.cantidad,
    unit_price: l.precioUnitario,
    currency_id: MONEDA,
  }));
  if (datos.envio > 0) {
    items.push({
      id: "envio",
      title: "Envío",
      quantity: 1,
      unit_price: datos.envio,
      currency_id: MONEDA,
    });
  }

  return {
    items,
    external_reference: datos.referencia,
    statement_descriptor: "ZENDA",
    back_urls: {
      success: regreso.toString(),
      pending: regreso.toString(),
      failure: regreso.toString(),
    },
    ...(publica ? { auto_return: "approved", notification_url: aviso.toString() } : {}),
  };
}

const RespuestaPreferencia = z.object({ id: z.string(), init_point: z.url() });

/**
 * Crea la orden de pago en Mercado Pago y devuelve la dirección del pago. `null` si Mercado Pago
 * no responde en 8 segundos o rechaza la orden (escenario 4).
 */
export async function crearPreferencia(
  config: ConfigMercadoPago,
  datos: DatosOrdenPago,
  pedirA: typeof fetch = fetch,
): Promise<{ id: string; url: string } | null> {
  try {
    const respuesta = await pedirA(`${config.urlApi}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
        // Si la misma orden se pide dos veces (por ejemplo, un reintento), Mercado Pago no la duplica.
        "X-Idempotency-Key": `${datos.referencia}-${datos.tokenAcceso.slice(0, 8)}`,
      },
      body: JSON.stringify(cuerpoPreferencia(datos)),
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!respuesta.ok) {
      console.error(`Mercado Pago rechazó la orden de pago (${respuesta.status})`);
      return null;
    }
    const r = RespuestaPreferencia.safeParse(await respuesta.json());
    return r.success ? { id: r.data.id, url: r.data.init_point } : null;
  } catch {
    return null;
  }
}

/**
 * Escenario 3: verifica que el aviso venga de Mercado Pago. El encabezado `x-signature` trae
 * `ts=…,v1=…`; v1 es HMAC-SHA256, con la clave secreta del webhook, de
 * `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` (se omite lo que no venga). Comparación en
 * tiempo constante.
 */
export function verificarFirmaAviso(
  {
    firma,
    idSolicitud,
    idDato,
  }: { firma: string | null; idSolicitud: string | null; idDato: string | null },
  secreto: string,
): boolean {
  if (!firma) return false;
  const partes = Object.fromEntries(
    firma.split(",").map((p) => {
      const [clave, ...valor] = p.split("=");
      return [clave.trim(), valor.join("=").trim()];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1?.toLowerCase();
  if (!ts || !v1) return false;
  const manifiesto =
    (idDato ? `id:${idDato.toLowerCase()};` : "") +
    (idSolicitud ? `request-id:${idSolicitud};` : "") +
    `ts:${ts};`;
  const esperado = createHmac("sha256", secreto).update(manifiesto).digest("hex");
  return v1.length === esperado.length && timingSafeEqual(Buffer.from(v1), Buffer.from(esperado));
}

/** Estado del pago traducido a lo que entiende Zenda. */
export type EstadoPasarela = "aprobado" | "rechazado" | "pendiente" | "otro";

/** El pago tal como lo informa la pasarela, ya consultado y verificado. */
export type PagoPasarela = {
  proveedor: "mercadopago";
  id: string;
  referencia: string;
  estado: EstadoPasarela;
  /** Estado original de la pasarela (approved, rejected…), para la trazabilidad. */
  estadoOriginal: string;
  /** Monto en pesos. */
  monto: number;
  moneda: string;
  metodo: string | null;
  /** `true` si Mercado Pago dice que es un pago real (`live_mode`), no de prueba. */
  real: boolean;
};

const RespuestaPago = z.object({
  id: z.union([z.number(), z.string()]),
  status: z.string(),
  external_reference: z.string().nullable(),
  transaction_amount: z.number(),
  currency_id: z.string(),
  payment_method_id: z.string().nullable().optional(),
  live_mode: z.boolean().optional(),
});

export function traducirEstado(estado: string): EstadoPasarela {
  if (estado === "approved") return "aprobado";
  if (estado === "rejected" || estado === "cancelled") return "rechazado";
  if (estado === "pending" || estado === "in_process" || estado === "authorized")
    return "pendiente";
  return "otro";
}

/**
 * RN3: el estado no se toma del aviso; se consulta el pago a Mercado Pago con la credencial
 * privada. `null` si no responde o el pago no tiene referencia de Zenda.
 */
export async function consultarPago(
  config: ConfigMercadoPago,
  idPago: string,
  pedirA: typeof fetch = fetch,
): Promise<PagoPasarela | null> {
  try {
    const respuesta = await pedirA(`${config.urlApi}/v1/payments/${encodeURIComponent(idPago)}`, {
      headers: { Authorization: `Bearer ${config.accessToken}` },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!respuesta.ok) return null;
    const r = RespuestaPago.safeParse(await respuesta.json());
    if (!r.success || !r.data.external_reference) return null;
    return {
      proveedor: "mercadopago",
      id: String(r.data.id),
      referencia: r.data.external_reference,
      estado: traducirEstado(r.data.status),
      estadoOriginal: r.data.status,
      monto: r.data.transaction_amount,
      moneda: r.data.currency_id,
      metodo: r.data.payment_method_id ?? null,
      real: r.data.live_mode === true,
    };
  } catch {
    return null;
  }
}
