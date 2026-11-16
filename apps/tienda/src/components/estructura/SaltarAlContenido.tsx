/**
 * Enlace oculto que aparece al navegar con teclado y lleva directo al contenido principal,
 * sin recorrer el encabezado (accesibilidad, CAT-01-CP4).
 */
export function SaltarAlContenido() {
  return (
    <a
      href="#contenido"
      className="sr-only bg-lima px-4 py-3 text-tinta focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
    >
      Saltar al contenido
    </a>
  );
}
