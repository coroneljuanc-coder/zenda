"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { guardarDatosEntrega } from "@/app/acciones/compra";
import { usePaginaLista } from "@/components/comun/usePaginaLista";
import {
  type CampoEntrega,
  type ErroresEntrega,
  primerCampoConError,
  validarDatosEntrega,
} from "@/lib/compra/datos-entrega";
import { DEPARTAMENTOS } from "@/lib/compra/divipola";

export type ValoresEntrega = {
  nombreCompleto: string;
  correo: string;
  celular: string;
  departamento: string;
  ciudad: string;
  direccion: string;
  detalles: string;
  notas: string;
  aceptoPolitica: boolean;
};

export const VALORES_VACIOS: ValoresEntrega = {
  nombreCompleto: "",
  correo: "",
  celular: "",
  departamento: "",
  ciudad: "",
  direccion: "",
  detalles: "",
  notas: "",
  aceptoPolitica: false,
};

const estiloCampo =
  "mt-1 min-h-12 w-full border border-tinta bg-blanco px-3 text-base aria-invalid:border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta";

/**
 * Formulario de datos de contacto y envío (ZTV-19). Una columna, etiquetas visibles y errores
 * junto a cada campo; al enviar con errores, el foco va al primero (escenario 3). El mismo
 * esquema valida aquí y en el servidor. La ciudad se filtra por departamento sin pedir nada al
 * servidor (rendimiento).
 */
export function FormularioEntrega({ inicial }: { inicial: ValoresEntrega }) {
  const router = useRouter();
  const lista = usePaginaLista();
  const [valores, setValores] = useState(inicial);
  const [errores, setErrores] = useState<ErroresEntrega>({});
  const [enviando, empezar] = useTransition();

  const municipios = useMemo(
    () => DEPARTAMENTOS.find((d) => d.codigo === valores.departamento)?.municipios ?? [],
    [valores.departamento],
  );

  function cambiar<K extends keyof ValoresEntrega>(campo: K, valor: ValoresEntrega[K]) {
    setValores((antes) => ({
      ...antes,
      [campo]: valor,
      // Al cambiar de departamento, la ciudad anterior ya no aplica.
      ...(campo === "departamento" ? { ciudad: "" } : {}),
    }));
    if (errores[campo as CampoEntrega]) {
      // Al corregir un campo, su mensaje de error desaparece.
      setErrores((antes) => {
        const siguientes = { ...antes };
        delete siguientes[campo as CampoEntrega];
        return siguientes;
      });
    }
  }

  function mostrar(nuevos: ErroresEntrega) {
    setErrores(nuevos);
    const primero = primerCampoConError(nuevos);
    if (primero) document.getElementById(`campo-${primero}`)?.focus();
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const local = validarDatosEntrega(valores);
    if (!local.ok) {
      mostrar(local.errores);
      return;
    }
    empezar(async () => {
      const respuesta = await guardarDatosEntrega(valores);
      if (respuesta.ok) router.push("/compra/resumen");
      else if ("irAlCarrito" in respuesta) router.push("/carrito");
      else mostrar(respuesta.errores);
    });
  }

  const propiedades = (campo: CampoEntrega) => ({
    id: `campo-${campo}`,
    name: campo,
    "aria-invalid": errores[campo] ? true : undefined,
    "aria-describedby": errores[campo] ? `error-${campo}` : undefined,
  });

  const error = (campo: CampoEntrega) =>
    errores[campo] && (
      <p id={`error-${campo}`} className="mt-1 text-sm font-semibold" data-prueba="error-campo">
        {errores[campo]}
      </p>
    );

  const etiqueta = (campo: CampoEntrega, texto: string, opcional = false) => (
    <label htmlFor={`campo-${campo}`} className="font-semibold">
      {texto}
      {opcional && <span className="font-normal text-gris"> (opcional)</span>}
    </label>
  );

  return (
    <form noValidate onSubmit={enviar} className="flex max-w-xl flex-col gap-8">
      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 text-xl font-extrabold">1. Tus datos</legend>
        <div>
          {etiqueta("nombreCompleto", "Nombre completo")}
          <input
            {...propiedades("nombreCompleto")}
            autoComplete="name"
            value={valores.nombreCompleto}
            onChange={(e) => cambiar("nombreCompleto", e.target.value)}
            className={estiloCampo}
          />
          {error("nombreCompleto")}
        </div>
        <div>
          {etiqueta("correo", "Correo electrónico")}
          <input
            {...propiedades("correo")}
            type="email"
            autoComplete="email"
            value={valores.correo}
            onChange={(e) => cambiar("correo", e.target.value)}
            className={estiloCampo}
          />
          {error("correo")}
        </div>
        <div>
          {etiqueta("celular", "Celular")}
          <input
            {...propiedades("celular")}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={valores.celular}
            onChange={(e) => cambiar("celular", e.target.value)}
            className={estiloCampo}
          />
          {error("celular")}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-4 text-xl font-extrabold">2. Dirección de entrega</legend>
        <p className="-mt-2 text-sm text-gris">Por ahora enviamos solo dentro de Colombia.</p>
        <div>
          {etiqueta("departamento", "Departamento")}
          <select
            {...propiedades("departamento")}
            autoComplete="address-level1"
            value={valores.departamento}
            onChange={(e) => cambiar("departamento", e.target.value)}
            className={estiloCampo}
          >
            <option value="">Selecciona…</option>
            {DEPARTAMENTOS.map((d) => (
              <option key={d.codigo} value={d.codigo}>
                {d.nombre}
              </option>
            ))}
          </select>
          {error("departamento")}
        </div>
        <div>
          {etiqueta("ciudad", "Ciudad o municipio")}
          <select
            {...propiedades("ciudad")}
            autoComplete="address-level2"
            value={valores.ciudad}
            onChange={(e) => cambiar("ciudad", e.target.value)}
            className={estiloCampo}
          >
            <option value="">
              {valores.departamento ? "Selecciona…" : "Primero elige el departamento"}
            </option>
            {municipios.map(([codigo, nombre]) => (
              <option key={codigo} value={codigo}>
                {nombre}
              </option>
            ))}
          </select>
          {error("ciudad")}
        </div>
        <div>
          {etiqueta("direccion", "Dirección")}
          <input
            {...propiedades("direccion")}
            autoComplete="address-line1"
            value={valores.direccion}
            onChange={(e) => cambiar("direccion", e.target.value)}
            className={estiloCampo}
          />
          {error("direccion")}
        </div>
        <div>
          {etiqueta("detalles", "Detalles: apartamento, torre, barrio", true)}
          <input
            {...propiedades("detalles")}
            autoComplete="address-line2"
            value={valores.detalles}
            onChange={(e) => cambiar("detalles", e.target.value)}
            className={estiloCampo}
          />
          {error("detalles")}
        </div>
        <div>
          {etiqueta("notas", "Notas para la entrega", true)}
          <textarea
            {...propiedades("notas")}
            rows={3}
            value={valores.notas}
            onChange={(e) => cambiar("notas", e.target.value)}
            className={`${estiloCampo} py-2`}
          />
          {error("notas")}
        </div>
      </fieldset>

      <div>
        <div className="flex items-start gap-3">
          <input
            {...propiedades("aceptoPolitica")}
            type="checkbox"
            checked={valores.aceptoPolitica}
            onChange={(e) => cambiar("aceptoPolitica", e.target.checked)}
            className="mt-1 size-6 shrink-0 accent-tinta"
          />
          <label htmlFor="campo-aceptoPolitica">
            Autorizo el tratamiento de mis datos personales según la{" "}
            <Link
              href="/politica-de-privacidad"
              className="underline underline-offset-4"
              target="_blank"
            >
              Política de privacidad<span className="sr-only"> (se abre en otra pestaña)</span>
            </Link>
          </label>
        </div>
        {error("aceptoPolitica")}
      </div>

      <button
        type="submit"
        disabled={!lista || enviando}
        className="min-h-12 w-full bg-tinta px-6 font-semibold text-blanco disabled:bg-linea disabled:text-gris"
      >
        {enviando ? "Guardando…" : "Continuar al pago"}
      </button>
    </form>
  );
}
