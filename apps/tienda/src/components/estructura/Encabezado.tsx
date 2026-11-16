import Link from "next/link";
import { listarCategoriasMenu } from "@/lib/catalogo/menu";
import { MenuCelular } from "./MenuCelular";

/**
 * Encabezado común (ZTV-10, escenario 1). El logo siempre lleva al inicio (RN2).
 * Menú de categorías desde la base de datos, en el orden del campo `orden` (RN1, ZTV-35):
 * en escritorio se ve en línea; en celular se abre con el botón «Menú».
 * El carrito llega con la épica E2; por ahora la bolsa muestra 0 productos y no es un enlace.
 */
export async function Encabezado() {
  const categorias = await listarCategoriasMenu();

  return (
    <header className="relative border-b border-linea">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 md:flex md:justify-between">
        <MenuCelular categorias={categorias} />
        <Link
          href="/"
          className="text-[1.75rem] leading-none font-extrabold tracking-[-0.04em]"
          aria-label="Zenda, ir al inicio"
        >
          zenda
        </Link>
        <nav aria-label="Categorías" className="hidden md:block">
          <ul className="flex gap-6 text-sm">
            {categorias.map((categoria) => (
              <li key={categoria.slug}>
                <Link
                  href={`/categoria/${categoria.slug}`}
                  className="flex min-h-11 items-center underline-offset-4 hover:underline"
                >
                  {categoria.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p
          className="flex min-h-11 items-center justify-self-end gap-2 text-sm"
          aria-label="Carrito: 0 productos"
        >
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
