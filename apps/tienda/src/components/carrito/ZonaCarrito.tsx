"use client";

import { createContext, useCallback, useContext, useEffect, useState, useTransition } from "react";
import { deshacerEliminacion } from "@/app/acciones/carrito";

type Eliminado = { producto: string; varianteId: string; cantidad: number };

const AvisarEliminado = createContext<(eliminado: Eliminado) => void>(() => {});

/** Para que cada línea avise que se eliminó (ZTV-18). */
export function useAvisarEliminado() {
  return useContext(AvisarEliminado);
}

/** RN2 de ZTV-18: «Deshacer» se ofrece durante 5 segundos. */
const SEGUNDOS_PARA_DESHACER = 5;

/**
 * Envuelve la página del carrito, tenga productos o esté vacío, para que el aviso «Eliminaste…»
 * con «Deshacer» siga visible aunque la línea desaparezca o el carrito quede vacío (RN3).
 */
export function ZonaCarrito({ children }: { children: React.ReactNode }) {
  const [eliminado, setEliminado] = useState<Eliminado | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [deshaciendo, empezarDeshacer] = useTransition();

  useEffect(() => {
    if (!eliminado) return;
    const reloj = setTimeout(() => setEliminado(null), SEGUNDOS_PARA_DESHACER * 1000);
    return () => clearTimeout(reloj);
  }, [eliminado]);

  const avisar = useCallback((nuevo: Eliminado) => {
    setMensaje(null);
    setEliminado(nuevo);
  }, []);

  function deshacer() {
    if (!eliminado) return;
    const { producto, varianteId, cantidad } = eliminado;
    empezarDeshacer(async () => {
      const respuesta = await deshacerEliminacion({ varianteId, cantidad });
      setEliminado(null);
      if (!respuesta.ok) setMensaje(`No pudimos devolver ${producto}: ${respuesta.mensaje}`);
    });
  }

  return (
    <AvisarEliminado.Provider value={avisar}>
      {/* Se anuncia a los lectores de pantalla (aria-live). */}
      <div role="status" data-prueba="aviso-eliminado">
        {eliminado && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-tinta p-3">
            <p className="font-semibold">Eliminaste {eliminado.producto} del carrito</p>
            <button
              type="button"
              onClick={deshacer}
              disabled={deshaciendo}
              className="min-h-11 border border-tinta px-4 font-semibold disabled:text-gris"
            >
              Deshacer
            </button>
          </div>
        )}
        {mensaje && <p className="mb-6 border-l-4 border-tinta pl-2 font-semibold">{mensaje}</p>}
      </div>
      {children}
    </AvisarEliminado.Provider>
  );
}
