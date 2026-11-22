/** Mensajes de la compra que se muestran tal cual al cliente (ZTV-20 y ZTV-86). */

/** Escenario 2 de ZTV-20: el catálogo cambió entre el resumen y «Pagar». */
export const MENSAJE_CARRITO_ACTUALIZADO =
  "Actualizamos tu carrito porque algunos productos cambiaron. Revisa antes de pagar.";

/** Escenario 4 de ZTV-86: no fue posible crear la orden de pago en Mercado Pago. */
export const MENSAJE_PASARELA_NO_DISPONIBLE =
  "No pudimos conectar con la pasarela de pago. Tu carrito sigue guardado; intenta de nuevo en unos minutos.";

/** Aviso bajo el botón «Pagar». */
export const AVISO_PAGO_PRUEBAS =
  "Serás dirigido a Mercado Pago, nuestra pasarela de pagos segura. Modo de pruebas: no se realizan cobros reales.";

/** Mensajes de la página de resultado del pago (ZTV-22). */
export const TEXTOS_RESULTADO = {
  pendiente: "Estamos esperando la confirmación de tu banco. Esto puede tardar unos minutos.",
  rechazado: "Tu pago no fue aprobado. No se realizó ningún cobro.",
  revision: "Estamos revisando tu pago. Te contactaremos pronto.",
} as const;
