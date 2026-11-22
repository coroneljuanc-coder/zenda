import type { DatosPedidoPagado } from "@zenda/contratos";

/**
 * Plantillas de los correos de compra (ZTV-23). Cada correo tiene versión HTML (tablas simples y
 * buen contraste, para Gmail y Outlook en celular y escritorio) y versión de texto plano.
 * RN2: los montos salen de la copia del pedido que trae el evento, no del catálogo.
 * RN4: mientras Zenda esté en pruebas, todo correo lleva la nota de pedido de prueba.
 */

export const NOTA_PRUEBAS = "Este es un pedido de prueba. No se realizó ningún cobro real.";

export type Correo = { asunto: string; html: string; texto: string };

const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** «$ 161.700», igual que en la tienda. */
export function pesos(valor: number): string {
  return `$ ${numero.format(valor)}`;
}

function escapar(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nombreLinea(l: DatosPedidoPagado["lineas"][number]): string {
  return l.descripcionVariante
    ? `${l.nombreProducto} (${l.descripcionVariante})`
    : l.nombreProducto;
}

function direccion(d: DatosPedidoPagado): string[] {
  const e = d.entrega;
  return [
    e.direccion + (e.detalles ? `, ${e.detalles}` : ""),
    `${e.ciudad}, ${e.departamento}`,
    ...(e.notas ? [`Notas: ${e.notas}`] : []),
  ];
}

function totalesTexto(d: DatosPedidoPagado): string[] {
  return [
    `Subtotal: ${pesos(d.subtotal)}`,
    `Envío: ${d.envio === 0 ? "Gratis" : pesos(d.envio)}`,
    `Total: ${pesos(d.total)}`,
  ];
}

const estiloTabla = 'style="border-collapse:collapse;width:100%;max-width:560px"';
const celda = 'style="padding:8px 4px;border-bottom:1px solid #e0e0e0;color:#111111"';
const celdaDerecha =
  'style="padding:8px 4px;border-bottom:1px solid #e0e0e0;color:#111111;text-align:right"';

function tablaHtml(d: DatosPedidoPagado): string {
  const filas = d.lineas
    .map(
      (l) =>
        `<tr><td ${celda}>${escapar(nombreLinea(l))}<br><span style="color:#5a5a5a">${l.cantidad} × ${pesos(l.precioUnitario)}</span></td><td ${celdaDerecha}>${pesos(l.totalLinea)}</td></tr>`,
    )
    .join("");
  const total = (etiqueta: string, valor: string, fuerte = false) =>
    `<tr><td ${celda}>${fuerte ? `<strong>${etiqueta}</strong>` : etiqueta}</td><td ${celdaDerecha}>${fuerte ? `<strong>${valor}</strong>` : valor}</td></tr>`;
  return `<table role="presentation" ${estiloTabla}>${filas}${total("Subtotal", pesos(d.subtotal))}${total("Envío", d.envio === 0 ? "Gratis" : pesos(d.envio))}${total("Total", pesos(d.total), true)}</table>`;
}

function marcoHtml(contenido: string, avisoDestinatario: string | null): string {
  const aviso = avisoDestinatario
    ? `<p style="background:#f2f2f2;padding:8px;color:#111111;font-size:14px">${escapar(avisoDestinatario)}</p>`
    : "";
  return `<!doctype html><html lang="es"><body style="margin:0;padding:16px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#111111"><div style="max-width:560px;margin:0 auto">${aviso}<p style="font-size:28px;font-weight:800;letter-spacing:-0.04em;margin:0 0 16px">zenda</p>${contenido}<p style="margin-top:24px;padding:8px;border:1px solid #111111;font-size:14px">${NOTA_PRUEBAS}</p></div></body></html>`;
}

/**
 * En modo de pruebas los correos llegan al vendedor (decisión del PO, planeación del Sprint 4):
 * esta línea dice a quién iba dirigido el correo.
 */
export function avisoModoPruebas(destinatarioOriginal: string): string {
  return `Para: ${destinatarioOriginal} (modo de pruebas)`;
}

/** Escenario 1: confirmación de compra para el cliente. */
export function correoConfirmacionCliente(
  d: DatosPedidoPagado,
  aviso: string | null = null,
): Correo {
  const nombre = d.cliente.nombre.split(" ")[0];
  const asunto = `Confirmación de tu pedido ${d.referencia} en Zenda`;
  const texto = [
    ...(aviso ? [aviso, ""] : []),
    `¡Hola, ${nombre}! Recibimos tu pago.`,
    "",
    `Referencia: ${d.referencia}`,
    "",
    ...d.lineas.map(
      (l) =>
        `- ${nombreLinea(l)}: ${l.cantidad} × ${pesos(l.precioUnitario)} = ${pesos(l.totalLinea)}`,
    ),
    "",
    ...totalesTexto(d),
    "",
    "Dirección de entrega:",
    ...direccion(d),
    "",
    NOTA_PRUEBAS,
  ].join("\n");
  const html = marcoHtml(
    `<h1 style="font-size:22px;margin:0 0 8px">¡Hola, ${escapar(nombre)}! Recibimos tu pago.</h1><p style="margin:0 0 16px">Referencia: <strong>${escapar(d.referencia)}</strong></p>${tablaHtml(d)}<h2 style="font-size:18px;margin:24px 0 8px">Dirección de entrega</h2><p style="margin:0">${direccion(d).map(escapar).join("<br>")}</p>`,
    aviso,
  );
  return { asunto, html, texto };
}

/** Escenario 2: aviso de nuevo pedido para el vendedor, con los datos de contacto y entrega. */
export function correoAvisoVendedor(d: DatosPedidoPagado): Correo {
  const asunto = `Nuevo pedido pagado: ${d.referencia} – ${pesos(d.total)}`;
  const contacto = [
    `Cliente: ${d.cliente.nombre}`,
    `Correo: ${d.cliente.correo}`,
    `Celular: ${d.cliente.celular}`,
  ];
  const texto = [
    `Nuevo pedido pagado: ${d.referencia}`,
    "",
    ...contacto,
    "",
    "Entregar en:",
    ...direccion(d),
    "",
    ...d.lineas.map((l) => `- ${nombreLinea(l)}: ${l.cantidad} × ${pesos(l.precioUnitario)}`),
    "",
    ...totalesTexto(d),
    ...(d.metodoPago ? [`Método de pago: ${d.metodoPago}`] : []),
    "",
    NOTA_PRUEBAS,
  ].join("\n");
  const html = marcoHtml(
    `<h1 style="font-size:22px;margin:0 0 8px">Nuevo pedido pagado</h1><p style="margin:0 0 16px">Referencia: <strong>${escapar(d.referencia)}</strong> · Total: <strong>${pesos(d.total)}</strong></p><h2 style="font-size:18px;margin:16px 0 8px">Contacto</h2><p style="margin:0">${contacto.map(escapar).join("<br>")}</p><h2 style="font-size:18px;margin:16px 0 8px">Entregar en</h2><p style="margin:0 0 16px">${direccion(d).map(escapar).join("<br>")}</p>${tablaHtml(d)}`,
    null,
  );
  return { asunto, html, texto };
}
