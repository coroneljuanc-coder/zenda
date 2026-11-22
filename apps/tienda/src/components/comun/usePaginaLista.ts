import { useSyncExternalStore } from "react";

/** No hay nada que escuchar: solo interesa distinguir el HTML inicial del navegador ya listo. */
function sinSuscripcion() {
  return () => {};
}

/**
 * `false` en el HTML inicial y mientras la página termina de cargar; `true` cuando ya responde a
 * los toques. Sirve para mostrar deshabilitados los controles que aún no funcionan, de modo que un
 * toque temprano no se pierda en silencio (ZTV-73).
 */
export function usePaginaLista(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
}
