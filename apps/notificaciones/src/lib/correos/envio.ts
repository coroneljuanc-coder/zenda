import { EsquemaDatosPedidoPagado } from "@zenda/contratos";
import type { PrismaClient, TipoCorreo } from "../../generated/prisma/client";
import {
  avisoModoPruebas,
  correoAvisoVendedor,
  correoConfirmacionCliente,
  type Correo,
} from "./plantillas";

/**
 * Envío de los correos de compra (ZTV-23) desde el servicio de Notificaciones.
 * - RN1: una sola vez por pedido y tipo (tabla EnvioCorreo con llave única evento + tipo).
 * - Escenario 3: hasta 3 intentos; si fallan, el correo queda FALLIDO con una alerta y el pedido
 *   sigue «Pagado» (el pago no depende de los correos).
 * - Modo de pruebas (decisión del PO en la planeación del Sprint 4): sin dominio propio, Resend
 *   solo deja enviar al dueño de la cuenta; todos los correos van a CORREO_VENDEDOR y dicen a quién
 *   iban dirigidos.
 */

export type ConfigCorreo = {
  apiKey: string;
  remitente: string;
  correoVendedor: string;
  modoPruebas: boolean;
};

/** RN3: la llave de Resend y el correo del vendedor viven solo en este servicio. */
export function leerConfigCorreo(
  entorno: Record<string, string | undefined> = process.env,
): ConfigCorreo | null {
  const apiKey = entorno.RESEND_API_KEY?.trim();
  const correoVendedor = entorno.CORREO_VENDEDOR?.trim();
  if (!apiKey || !correoVendedor) return null;
  return {
    apiKey,
    correoVendedor,
    // Remitente de pruebas de Resend; con un dominio verificado se cambia por uno propio.
    remitente: entorno.CORREO_REMITENTE?.trim() || "Zenda <onboarding@resend.dev>",
    // Solo cuando haya dominio propio y ventas reales se activan los destinatarios reales.
    modoPruebas: entorno.ZENDA_CORREOS_REALES !== "1",
  };
}

export type MensajeCorreo = Correo & { para: string; idempotencia: string };

/** Envía un correo con la API de Resend. Devuelve el id de Resend o lanza con el motivo. */
export type EnviarCorreo = (m: MensajeCorreo) => Promise<string>;

export function enviadorResend(config: ConfigCorreo, pedirA: typeof fetch = fetch): EnviarCorreo {
  return async (m) => {
    const r = await pedirA("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        // Si un reintento repite el mismo envío, Resend no lo duplica.
        "Idempotency-Key": m.idempotencia,
      },
      body: JSON.stringify({
        from: config.remitente,
        to: [m.para],
        subject: m.asunto,
        html: m.html,
        text: m.texto,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) throw new Error(`Resend respondió ${r.status}`);
    const cuerpo = (await r.json().catch(() => ({}))) as { id?: string };
    return cuerpo.id ?? "";
  };
}

/** Espera entre intentos: 2 y 5 segundos (los reintentos ocurren después de responder a la tienda). */
export const ESPERAS_REINTENTO_MS = [2_000, 5_000];

export type ResultadoCorreos = { enviados: number; fallidos: number; omitidos: number };

/** Prepara y envía los correos de un evento «pedido.pagado» ya registrado. */
export async function enviarCorreosPedido(
  bd: PrismaClient,
  eventoId: string,
  config: ConfigCorreo,
  {
    enviar = enviadorResend(config),
    esperar = (ms: number) => new Promise<void>((listo) => setTimeout(listo, ms)),
    ahora = () => new Date(),
  }: { enviar?: EnviarCorreo; esperar?: (ms: number) => Promise<void>; ahora?: () => Date } = {},
): Promise<ResultadoCorreos> {
  const evento = await bd.eventoRecibido.findUniqueOrThrow({ where: { id: eventoId } });
  const datos = EsquemaDatosPedidoPagado.parse(evento.datos);

  const planes: { tipo: TipoCorreo; destinatario: string; correo: Correo }[] = [
    {
      tipo: "CONFIRMACION_CLIENTE",
      destinatario: datos.cliente.correo,
      correo: correoConfirmacionCliente(
        datos,
        config.modoPruebas ? avisoModoPruebas(datos.cliente.correo) : null,
      ),
    },
    {
      tipo: "AVISO_VENDEDOR",
      destinatario: config.correoVendedor,
      correo: correoAvisoVendedor(datos),
    },
  ];
  // RN1: se registran una sola vez; si ya existían, no se crean de nuevo.
  await bd.envioCorreo.createMany({
    data: planes.map((p) => ({ eventoId, tipo: p.tipo, destinatario: p.destinatario })),
    skipDuplicates: true,
  });

  const resultado: ResultadoCorreos = { enviados: 0, fallidos: 0, omitidos: 0 };
  for (const plan of planes) {
    // Escenario 4: solo se envía si sigue PENDIENTE y nadie más lo tomó (cambio atómico a intentos+1).
    const registro = await bd.envioCorreo.findUniqueOrThrow({
      where: { eventoId_tipo: { eventoId, tipo: plan.tipo } },
    });
    if (registro.estado !== "PENDIENTE") {
      resultado.omitidos++;
      continue;
    }
    const tomado = await bd.envioCorreo.updateMany({
      where: { id: registro.id, estado: "PENDIENTE", intentos: registro.intentos },
      data: { intentos: { increment: 1 } },
    });
    if (tomado.count === 0) {
      resultado.omitidos++;
      continue;
    }

    const para = config.modoPruebas ? config.correoVendedor : plan.destinatario;
    let ultimoError = "";
    let enviado = false;
    for (let intento = 1; intento <= 3; intento++) {
      try {
        const proveedorId = await enviar({
          ...plan.correo,
          para,
          idempotencia: `${eventoId}-${plan.tipo}`,
        });
        await bd.envioCorreo.update({
          where: { id: registro.id },
          data: {
            estado: "ENVIADO",
            intentos: registro.intentos + intento,
            proveedorId,
            enviadoEn: ahora(),
            ultimoError: null,
          },
        });
        enviado = true;
        break;
      } catch (causa) {
        ultimoError = causa instanceof Error ? causa.message : "error desconocido";
        if (intento < 3) await esperar(ESPERAS_REINTENTO_MS[intento - 1]);
      }
    }
    if (enviado) {
      resultado.enviados++;
    } else {
      await bd.envioCorreo.update({
        where: { id: registro.id },
        data: { estado: "FALLIDO", intentos: registro.intentos + 3, ultimoError },
      });
      console.error(
        `[ALERTA] Correo pendiente: ${plan.tipo} del pedido ${datos.referencia} no se pudo enviar (${ultimoError}).`,
      );
      resultado.fallidos++;
    }
  }
  return resultado;
}
