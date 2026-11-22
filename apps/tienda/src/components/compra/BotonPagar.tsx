"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { pagar } from "@/app/acciones/compra";
import { usePaginaLista } from "@/components/comun/usePaginaLista";
import { AVISO_PAGO_PRUEBAS } from "@/lib/compra/mensajes";
import { formatearCOP } from "@/lib/formato";

/**
 * «Pagar $ X» (ZTV-20). Crea el pedido en el servidor y lleva al cliente a la página de pago de
 * Wompi. Mientras procesa queda deshabilitado con «Procesando…» y se anuncia a los lectores de
 * pantalla (escenario 4).
 */
export function BotonPagar({ total }: { total: number }) {
  const router = useRouter();
  const lista = usePaginaLista();
  const [procesando, empezar] = useTransition();
  const [redirigiendo, setRedirigiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ocupado = procesando || redirigiendo;

  function tocar() {
    setError(null);
    empezar(async () => {
      const respuesta = await pagar({ totalVisto: total });
      if (respuesta.ok) {
        setRedirigiendo(true);
        window.location.assign(respuesta.url);
      } else if ("irA" in respuesta) {
        router.push(respuesta.irA);
      } else {
        setError(respuesta.mensaje);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={tocar}
        disabled={!lista || ocupado}
        aria-describedby="aviso-pago"
        className="min-h-12 w-full bg-tinta px-6 font-semibold text-blanco disabled:bg-linea disabled:text-gris"
      >
        {ocupado ? "Procesando…" : `Pagar ${formatearCOP(total)}`}
      </button>
      <p role="status" className="sr-only">
        {ocupado ? "Procesando el pago" : ""}
      </p>
      {error && (
        <p role="alert" className="mt-3 border-l-4 border-tinta pl-2 text-sm font-semibold">
          {error}
        </p>
      )}
      <p id="aviso-pago" className="mt-2 text-center text-sm text-gris">
        {AVISO_PAGO_PRUEBAS}
      </p>
    </>
  );
}
