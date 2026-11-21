import { DIAS_DE_VIGENCIA } from "./reglas";

/** Cookie que reconoce el carrito del visitante (ZTV-16). Solo guarda el token, nunca datos. */
export const COOKIE_CARRITO = "zenda_carrito";

/**
 * Requisito de seguridad de ZTV-16: `HttpOnly` (el JavaScript de la página no la lee), `Secure`
 * (solo viaja por HTTPS; los navegadores la aceptan también en http://localhost) y
 * `SameSite=Lax` (no viaja en peticiones de otros sitios). Dura lo mismo que el carrito (RN5).
 */
export function opcionesCookieCarrito() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: DIAS_DE_VIGENCIA * 24 * 60 * 60,
  };
}
