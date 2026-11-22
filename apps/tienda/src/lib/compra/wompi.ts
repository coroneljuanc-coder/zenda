import { createHash } from "node:crypto";

/**
 * Integración con Wompi (D1) en modo de pruebas (sandbox). Zenda nunca ve ni guarda datos de
 * tarjetas: el cliente paga en la página de Wompi (Web Checkout) y Wompi avisa el resultado por
 * webhook (ZTV-21). Las llaves viven solo en variables de entorno del servidor.
 */

export const URL_CHECKOUT = "https://checkout.wompi.co/p/";
export const URL_API_SANDBOX = "https://sandbox.wompi.co/v1";
export const MONEDA = "COP";

export type ConfigWompi = {
  llavePublica: string;
  secretoIntegridad: string;
  urlApi: string;
};

/**
 * Lee la configuración de Wompi. Devuelve `null` si falta algo o si la llave no es de pruebas:
 * mientras aprendemos, Zenda solo usa el sandbox (nunca cobros reales).
 */
export function leerConfigWompi(
  entorno: Record<string, string | undefined> = process.env,
): ConfigWompi | null {
  const llavePublica = entorno.WOMPI_LLAVE_PUBLICA?.trim();
  const secretoIntegridad = entorno.WOMPI_SECRETO_INTEGRIDAD?.trim();
  if (!llavePublica || !secretoIntegridad) return null;
  if (!llavePublica.startsWith("pub_test_")) return null;
  return {
    llavePublica,
    secretoIntegridad,
    urlApi: entorno.WOMPI_URL_API?.trim() || URL_API_SANDBOX,
  };
}

/** RN4: el valor viaja en centavos. */
export function aCentavos(pesos: number): number {
  return pesos * 100;
}

/**
 * RN4: firma de integridad de Wompi = SHA-256 de referencia + monto en centavos + moneda +
 * secreto de integridad. Así nadie puede cambiar el valor en el navegador.
 */
export function firmaIntegridad(
  referencia: string,
  montoEnCentavos: number,
  moneda: string,
  secreto: string,
): string {
  return createHash("sha256")
    .update(`${referencia}${montoEnCentavos}${moneda}${secreto}`)
    .digest("hex");
}

/**
 * Dirección del Web Checkout de Wompi para un pedido. No lleva datos personales del cliente:
 * el cliente los escribe en la página de Wompi.
 */
export function urlCheckout(
  config: ConfigWompi,
  { referencia, total, urlRegreso }: { referencia: string; total: number; urlRegreso: string },
): string {
  const centavos = aCentavos(total);
  const parametros = new URLSearchParams({
    "public-key": config.llavePublica,
    currency: MONEDA,
    "amount-in-cents": String(centavos),
    reference: referencia,
    "signature:integrity": firmaIntegridad(referencia, centavos, MONEDA, config.secretoIntegridad),
    "redirect-url": urlRegreso,
  });
  return `${URL_CHECKOUT}?${parametros.toString()}`;
}

/**
 * Escenario 3 de ZTV-20: comprueba que Wompi responde y reconoce la llave antes de enviar al
 * cliente. Espera como máximo 5 segundos.
 */
export async function wompiDisponible(
  config: ConfigWompi,
  pedirA: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const respuesta = await pedirA(`${config.urlApi}/merchants/${config.llavePublica}`, {
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    return respuesta.ok;
  } catch {
    return false;
  }
}
