"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { agregarAlCarrito } from "@/app/acciones/carrito";
import { usePaginaLista } from "@/components/comun/usePaginaLista";
import { cantidadMaxima, MAXIMO_POR_LINEA } from "@/lib/carrito/reglas";
import { muestraDeColor } from "@/lib/catalogo/colores";
import { textoDisponibilidad } from "@/lib/catalogo/reglas";
import {
  buscarVariante,
  evaluarSeleccion,
  opcionDisponible,
  opcionesDe,
  seleccionInicial,
  TEXTO_COMBINACION_AGOTADA,
  textoFalta,
  type Atributo,
  type Seleccion,
  type VarianteFicha,
} from "@/lib/catalogo/variantes";
import { formatearCOP } from "@/lib/formato";

type Props = {
  variantes: VarianteFicha[];
  /** Precio del producto antes de elegir («$ 89.900» o «Desde $ 49.900»). */
  textoPrecio: string;
  /** Disponibilidad del producto completo antes de elegir. */
  disponibilidad: string;
  /** Todo el producto está agotado (ZTV-13, escenario 3). */
  agotado: boolean;
};

/**
 * Lee la variante de la dirección (`?variante={sku}`) una sola vez, al abrir la ficha, para que
 * un enlace compartido abra con esa talla y ese color. Va dentro de un `Suspense` en la página.
 */
export function CompraProductoConUrl(props: Props) {
  const parametros = useSearchParams();
  const [sku] = useState(() => parametros.get("variante"));
  return <CompraProducto {...props} skuInicial={sku} />;
}

/**
 * Precio, disponibilidad, selector de talla y color (ZTV-15), cantidad y botón «Agregar al
 * carrito» (ZTV-16) de la ficha. Al elegir, cambian el precio (RN1) y la disponibilidad, y la
 * dirección pasa a `?variante={sku}` sin recargar la página. Las reglas del carrito se validan
 * en el servidor; aquí solo se muestran sus avisos.
 */
export function CompraProducto({
  variantes,
  textoPrecio,
  disponibilidad,
  agotado,
  skuInicial = null,
}: Props & { skuInicial?: string | null }) {
  const [seleccion, setSeleccion] = useState<Seleccion>(() =>
    seleccionInicial(variantes, skuInicial),
  );
  // Los avisos «Selecciona…» solo aparecen después de intentar agregar (escenario 3).
  const [intentoAgregar, setIntentoAgregar] = useState(false);
  const grupos = useRef<Partial<Record<Atributo, HTMLFieldSetElement | null>>>({});
  const [cantidad, setCantidad] = useState(1);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agregando, empezarAgregar] = useTransition();
  // ZTV-73: hasta que la página esté lista para responder, los botones se ven deshabilitados; así
  // un toque temprano no se pierde en silencio.
  const lista = usePaginaLista();

  const { tallas, colores } = opcionesDe(variantes);
  const estado = evaluarSeleccion(variantes, seleccion);
  const variante = estado.tipo === "incompleta" ? null : estado.variante;
  const faltan = intentoAgregar && estado.tipo === "incompleta" ? estado.faltan : [];

  const precio = variante ? formatearCOP(variante.precio) : textoPrecio;
  const textoEstado =
    estado.tipo === "lista"
      ? textoDisponibilidad(estado.variante.stock)
      : estado.tipo === "agotada"
        ? "Agotado"
        : disponibilidad;
  const sinStock = estado.tipo === "agotada" || (estado.tipo === "incompleta" && agotado);
  // RN1 de ZTV-16: de 1 al menor valor entre el stock de la variante y 10.
  const maximo = estado.tipo === "lista" ? cantidadMaxima(estado.variante.stock) : MAXIMO_POR_LINEA;
  const cantidadElegida = Math.min(cantidad, Math.max(1, maximo));

  function elegir(atributo: Atributo, valor: string) {
    const nueva = { ...seleccion, [atributo]: valor };
    setSeleccion(nueva);
    setAviso(null);
    setError(null);
    const exacta = buscarVariante(variantes, nueva);
    const url = new URL(window.location.href);
    if (exacta) url.searchParams.set("variante", exacta.sku);
    else url.searchParams.delete("variante");
    window.history.replaceState(null, "", url);
  }

  function agregar() {
    setIntentoAgregar(true);
    if (estado.tipo === "incompleta") {
      // Lleva el foco al primer selector que falta, donde aparece su aviso.
      grupos.current[estado.faltan[0]]?.querySelector("input")?.focus();
      return;
    }
    if (estado.tipo !== "lista") return; // «agotada»: el botón está deshabilitado (RN2).
    const varianteId = estado.variante.id;
    empezarAgregar(async () => {
      const respuesta = await agregarAlCarrito({ varianteId, cantidad: cantidadElegida });
      setAviso(respuesta.ok ? respuesta.aviso : null);
      setError(respuesta.ok ? null : respuesta.mensaje);
    });
  }

  return (
    <>
      <p className="mt-3 text-2xl font-extrabold" data-prueba="precio">
        {precio}
      </p>
      {/* La disponibilidad se dice con palabras, no solo con color (accesibilidad). */}
      <p
        className={`mt-2 inline-block px-2 py-1 text-sm ${sinStock ? "bg-tinta text-blanco" : "bg-superficie"}`}
        data-prueba="disponibilidad"
      >
        {textoEstado}
      </p>

      {tallas.length > 0 && (
        <GrupoOpciones
          atributo="talla"
          titulo="Talla"
          opciones={tallas}
          variantes={variantes}
          seleccion={seleccion}
          falta={faltan.includes("talla")}
          activo={lista}
          onElegir={elegir}
          refGrupo={(el) => {
            grupos.current.talla = el;
          }}
        />
      )}
      {colores.length > 0 && (
        <GrupoOpciones
          atributo="color"
          titulo="Color"
          opciones={colores}
          variantes={variantes}
          seleccion={seleccion}
          falta={faltan.includes("color")}
          activo={lista}
          onElegir={elegir}
          refGrupo={(el) => {
            grupos.current.color = el;
          }}
        />
      )}
      {estado.tipo === "agotada" && (
        <p role="status" className="mt-4 font-semibold">
          {TEXTO_COMBINACION_AGOTADA}
        </p>
      )}

      <div className="mt-8 border-t border-linea pt-6">
        {agotado ? (
          <p className="font-medium">Este producto no está disponible por ahora</p>
        ) : (
          <>
            <SelectorCantidad
              valor={cantidadElegida}
              maximo={maximo}
              activo={lista}
              onCambiar={(n) => {
                setCantidad(n);
                setError(null);
              }}
            />
            {/* En celular, el botón queda fijo abajo de la pantalla; en escritorio, en su lugar. */}
            <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-blanco p-4 md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
              {/* El aviso se anuncia a los lectores de pantalla (aria-live). */}
              <div role="status" data-prueba="aviso-carrito">
                {aviso && (
                  <div className="mb-3 border border-tinta p-3">
                    <p className="font-semibold">{aviso}</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      <Link
                        href="/carrito"
                        className="flex min-h-11 items-center bg-tinta px-4 font-semibold text-blanco"
                      >
                        Ver carrito
                      </Link>
                      <button
                        type="button"
                        onClick={() => setAviso(null)}
                        className="min-h-11 border border-tinta px-4 font-semibold"
                      >
                        Seguir comprando
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {error && (
                <p role="alert" className="mb-3 border-l-4 border-tinta pl-2 font-semibold">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={agregar}
                disabled={!lista || estado.tipo === "agotada" || agregando}
                className="min-h-12 w-full bg-tinta px-6 font-semibold text-blanco disabled:bg-superficie disabled:text-gris md:w-auto"
              >
                {agregando ? "Agregando…" : "Agregar al carrito"}
              </button>
            </div>
            {/* Espacio para que la barra fija del celular no tape el final de la página. */}
            <div aria-hidden="true" className="h-24 md:hidden" />
          </>
        )}
      </div>
    </>
  );
}

/** Selector de cantidad − 1 + (ZTV-16). Funciona con teclado y anuncia el valor al cambiar. */
function SelectorCantidad({
  valor,
  maximo,
  activo,
  onCambiar,
}: {
  valor: number;
  maximo: number;
  /** `false` mientras la página termina de cargar (ZTV-73). */
  activo: boolean;
  onCambiar: (n: number) => void;
}) {
  const idEtiqueta = useId();
  const boton =
    "flex size-11 items-center justify-center text-xl disabled:text-linea focus-visible:outline-2 focus-visible:outline-tinta";
  return (
    <div className="flex items-center gap-4">
      <span id={idEtiqueta} className="font-semibold">
        Cantidad
      </span>
      <div
        role="group"
        aria-labelledby={idEtiqueta}
        className="flex items-center border border-linea"
      >
        <button
          type="button"
          aria-label="Disminuir cantidad"
          disabled={!activo || valor <= 1}
          onClick={() => onCambiar(valor - 1)}
          className={boton}
        >
          −
        </button>
        <output
          aria-live="polite"
          className="w-10 text-center font-semibold"
          data-prueba="cantidad"
        >
          {valor}
        </output>
        <button
          type="button"
          aria-label="Aumentar cantidad"
          disabled={!activo || valor >= maximo}
          onClick={() => onCambiar(valor + 1)}
          className={boton}
        >
          +
        </button>
      </div>
    </div>
  );
}

type GrupoProps = {
  atributo: Atributo;
  titulo: string;
  opciones: string[];
  variantes: VarianteFicha[];
  seleccion: Seleccion;
  falta: boolean;
  /** `false` mientras la página termina de cargar: un toque temprano no se pierde (ZTV-73). */
  activo: boolean;
  onElegir: (atributo: Atributo, valor: string) => void;
  refGrupo: (el: HTMLFieldSetElement | null) => void;
};

/**
 * Grupo de botones de opción con nombre accesible («Talla», «Color»). Son radios reales: se usan
 * con teclado (flechas) y el lector de pantalla dice cuál está elegido. Una opción sin stock para
 * lo ya elegido aparece tachada y el lector dice «agotada» (escenario 2).
 */
function GrupoOpciones({
  atributo,
  titulo,
  opciones,
  variantes,
  seleccion,
  falta,
  activo,
  onElegir,
  refGrupo,
}: GrupoProps) {
  const nombre = useId();
  const idAviso = `${nombre}-aviso`;
  const elegido = seleccion[atributo];

  return (
    <fieldset
      ref={refGrupo}
      className="mt-6"
      aria-describedby={falta ? idAviso : undefined}
      data-prueba={`selector-${atributo}`}
    >
      <legend className="font-semibold">
        {titulo}
        {elegido && <span className="font-normal">: {elegido}</span>}
      </legend>
      {falta && (
        <p id={idAviso} role="alert" className="mt-1 border-l-4 border-tinta pl-2 font-semibold">
          {textoFalta(atributo)}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {opciones.map((valor) => {
          const disponible = opcionDisponible(variantes, atributo, valor, seleccion);
          return (
            <label key={valor}>
              <input
                type="radio"
                name={nombre}
                value={valor}
                checked={elegido === valor}
                disabled={!activo}
                onChange={() => onElegir(atributo, valor)}
                className="peer sr-only"
              />
              <span
                className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 border px-3 peer-checked:border-tinta peer-checked:bg-tinta peer-checked:text-blanco peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-tinta ${
                  disponible ? "border-linea" : "border-dashed border-linea text-gris line-through"
                }`}
              >
                {atributo === "color" && (
                  <span
                    aria-hidden="true"
                    className="size-4 shrink-0 border border-linea"
                    style={{ backgroundColor: muestraDeColor(valor) }}
                  />
                )}
                {valor}
                {!disponible && <span className="sr-only"> (agotada)</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
