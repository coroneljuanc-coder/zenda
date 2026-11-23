"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Escenario 2 de ZTV-22: actualiza la página cada 5 segundos durante 2 minutos. */
export const INTERVALO_MS = 5_000;
export const LIMITE_MS = 120_000;

export const MENSAJE_SIGUE_PENDIENTE = "Te avisaremos por correo cuando tu banco confirme el pago.";

export function EsperaConfirmacion() {
  const router = useRouter();
  const [agotado, setAgotado] = useState(false);

  useEffect(() => {
    const inicio = Date.now();
    const temporizador = setInterval(() => {
      if (Date.now() - inicio >= LIMITE_MS) {
        clearInterval(temporizador);
        setAgotado(true);
        return;
      }
      router.refresh();
    }, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [router]);

  return (
    <p className="mt-4 text-gris" role="status" data-prueba="espera">
      {agotado ? MENSAJE_SIGUE_PENDIENTE : "Esta página se actualiza sola."}
    </p>
  );
}
