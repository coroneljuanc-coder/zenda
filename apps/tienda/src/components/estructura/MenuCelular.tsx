"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { CategoriaMenu } from "@/lib/catalogo/categorias";

/**
 * Menú de categorías en celular (ZTV-10, escenario 2): el botón «Menú» (☰) despliega la lista,
 * que se cierra con «Cerrar», con la tecla Escape o al elegir una categoría.
 * El botón lleva texto además del ícono para que nadie tenga que adivinar qué hace.
 */
export function MenuCelular({ categorias }: { categorias: CategoriaMenu[] }) {
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const botonAbrir = useRef<HTMLButtonElement>(null);
  const botonCerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    botonCerrar.current?.focus();
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setAbierto(false);
      botonAbrir.current?.focus();
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [abierto]);

  function cerrar() {
    setAbierto(false);
    botonAbrir.current?.focus();
  }

  return (
    <div className="md:hidden">
      <button
        ref={botonAbrir}
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto(true)}
        className="flex min-h-11 items-center gap-2 text-sm"
      >
        <IconoMenu />
        Menú
      </button>

      {abierto && (
        <div
          id={idPanel}
          className="absolute inset-x-0 top-full z-40 border-b border-tinta bg-blanco"
        >
          <div className="flex items-center justify-between border-b border-linea px-4 py-2">
            <p className="text-sm text-gris">Categorías</p>
            <button
              ref={botonCerrar}
              type="button"
              onClick={cerrar}
              className="min-h-11 px-2 text-sm underline underline-offset-4"
            >
              Cerrar
            </button>
          </div>
          <nav aria-label="Categorías">
            <ul>
              {categorias.map((categoria) => (
                <li key={categoria.slug} className="border-b border-linea last:border-b-0">
                  <Link
                    href={`/categoria/${categoria.slug}`}
                    onClick={() => setAbierto(false)}
                    className="flex min-h-12 items-center px-4 text-lg"
                  >
                    {categoria.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}

function IconoMenu() {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
