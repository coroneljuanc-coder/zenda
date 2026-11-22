"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

const MINIMO = 2;
const MENSAJE_CORTA = "Escribe al menos 2 caracteres";

function Lupa() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

/**
 * Buscador del encabezado (ZTV-14). En escritorio se ve siempre; en celular se abre con la lupa.
 * Escenario 4: con menos de 2 caracteres no busca y muestra «Escribe al menos 2 caracteres».
 */
export function Buscador({ variante }: { variante: "escritorio" | "celular" }) {
  const router = useRouter();
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formulario = (
    <form
      role="search"
      action="/buscar"
      className="flex flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        const texto = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        if (texto.length < MINIMO) {
          setError(MENSAJE_CORTA);
          return;
        }
        setError(null);
        setAbierto(false);
        router.push(`/buscar?q=${encodeURIComponent(texto)}`);
      }}
    >
      <div className="flex">
        <label htmlFor={`${id}-q`} className="sr-only">
          Buscar productos
        </label>
        <input
          id={`${id}-q`}
          name="q"
          type="search"
          maxLength={60}
          placeholder="Buscar en Zenda…"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-h-11 w-full min-w-0 border border-tinta px-3 text-base md:w-56"
          onChange={() => error && setError(null)}
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="flex min-h-11 min-w-11 items-center justify-center bg-tinta text-blanco"
        >
          <Lupa />
        </button>
      </div>
      <p id={`${id}-error`} role="status" className="mt-1 min-h-0 text-sm">
        {error}
      </p>
    </form>
  );

  if (variante === "escritorio") return <div className="hidden md:block">{formulario}</div>;

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={abierto ? "Cerrar el buscador" : "Abrir el buscador"}
        aria-expanded={abierto}
        aria-controls={`${id}-panel`}
        onClick={() => setAbierto((a) => !a)}
        className="flex min-h-11 min-w-11 items-center justify-center"
      >
        <Lupa />
      </button>
      {abierto && (
        <div
          id={`${id}-panel`}
          className="absolute inset-x-0 top-full z-20 border-b border-linea bg-blanco px-4 py-3"
        >
          {formulario}
        </div>
      )}
    </div>
  );
}
