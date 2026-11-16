import Link from "next/link";

/**
 * Encabezado común (ZTV-10, escenario 1). El logo siempre lleva al inicio (RN2).
 * El menú de categorías llega con ZTV-35 y el carrito con la épica E2; por ahora la bolsa
 * muestra 0 productos y no es un enlace.
 */
export function Encabezado() {
  return (
    <header className="border-b border-linea">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-[1.75rem] leading-none font-extrabold tracking-[-0.04em]"
          aria-label="Zenda, ir al inicio"
        >
          zenda
        </Link>
        <p className="flex min-h-11 items-center gap-2 text-sm" aria-label="Carrito: 0 productos">
          <IconoBolsa />
          <span aria-hidden="true">0</span>
        </p>
      </div>
    </header>
  );
}

function IconoBolsa() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
    >
      <path d="M5 8h14l-1 13H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
