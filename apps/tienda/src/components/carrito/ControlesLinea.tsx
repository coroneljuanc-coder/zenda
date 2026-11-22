"use client";

import { startTransition, useRef, useState, useTransition } from "react";
import { cambiarCantidad, eliminarDelCarrito } from "@/app/acciones/carrito";
import { usePaginaLista } from "@/components/comun/usePaginaLista";
import { useAvisarEliminado } from "./ZonaCarrito";

const SIN_MAS_UNIDADES = "No hay más unidades disponibles";

type Props = {
  lineaId: string;
  varianteId: string;
  producto: string;
  cantidad: number;
  /** El menor entre el stock y 10 (RN1). */
  maximo: number;
  disponible: boolean;
};

/**
 * Controles de una línea del carrito (ZTV-18): − cantidad + y «Eliminar».
 * - La cantidad cambia en pantalla al instante; el servidor la valida y, si no la acepta, se
 *   corrige y se explica (RN4). Varios toques rápidos se envían en orden con el valor final.
 * - «−» se deshabilita en 1 (escenario 3); «+» en el máximo avisa «No hay más unidades
 *   disponibles» (escenario 4).
 * - Totales, subtotal y contador del encabezado se actualizan sin recargar la página.
 */
export function ControlesLinea({
  lineaId,
  varianteId,
  producto,
  cantidad: inicial,
  maximo,
  disponible,
}: Props) {
  const lista = usePaginaLista();
  const avisarEliminado = useAvisarEliminado();
  const [cantidad, setCantidad] = useState(inicial);
  // La última cantidad pedida, para calcular bien varios toques seguidos.
  const pedida = useRef(inicial);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [eliminando, empezarEliminar] = useTransition();

  function cambiar(paso: 1 | -1) {
    const nueva = pedida.current + paso;
    if (nueva < 1) return;
    if (nueva > maximo) {
      setMensaje(SIN_MAS_UNIDADES);
      return;
    }
    setMensaje(null);
    pedida.current = nueva;
    setCantidad(nueva);
    startTransition(async () => {
      const respuesta = await cambiarCantidad({ lineaId, cantidad: nueva });
      if (!respuesta.ok && pedida.current === nueva) {
        if (respuesta.cantidad !== null) {
          pedida.current = respuesta.cantidad;
          setCantidad(respuesta.cantidad);
        }
        setMensaje(respuesta.mensaje);
      }
    });
  }

  function eliminar() {
    setMensaje(null);
    empezarEliminar(async () => {
      const respuesta = await eliminarDelCarrito({ lineaId });
      if (respuesta.ok) {
        avisarEliminado({ producto, varianteId, cantidad: respuesta.cantidad });
      } else {
        setMensaje(respuesta.mensaje);
      }
    });
  }

  const boton =
    "flex size-11 items-center justify-center text-xl disabled:text-linea focus-visible:outline-2 focus-visible:outline-tinta";

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4">
        {disponible && (
          <div
            role="group"
            aria-label={`Cantidad de ${producto}`}
            className="flex items-center border border-linea"
          >
            <button
              type="button"
              aria-label={`Disminuir cantidad de ${producto}`}
              disabled={!lista || eliminando || cantidad <= 1}
              onClick={() => cambiar(-1)}
              className={boton}
            >
              −
            </button>
            <output
              aria-live="polite"
              className="w-10 text-center font-semibold"
              data-prueba="cantidad-linea"
            >
              {cantidad}
            </output>
            <button
              type="button"
              aria-label={`Aumentar cantidad de ${producto}`}
              disabled={!lista || eliminando}
              onClick={() => cambiar(1)}
              className={boton}
            >
              +
            </button>
          </div>
        )}
        <button
          type="button"
          aria-label={`Eliminar ${producto} del carrito`}
          disabled={!lista || eliminando}
          onClick={eliminar}
          className="min-h-11 text-sm underline underline-offset-4 disabled:text-gris"
        >
          {eliminando ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
      {mensaje && (
        <p role="alert" className="self-start border-l-4 border-tinta pl-2 text-sm font-semibold">
          {mensaje}
        </p>
      )}
    </div>
  );
}
