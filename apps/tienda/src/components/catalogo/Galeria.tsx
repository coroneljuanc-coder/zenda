"use client";

import Image from "next/image";
import { useState } from "react";

type Foto = { url: string; textoAlternativo: string };

const sinOptimizar = (url: string) => url.endsWith(".svg");

/**
 * Galería de la ficha (ZTV-13, ZTV-49).
 * - Celular: las fotos ocupan todo el ancho y se deslizan con el dedo (desplazamiento con
 *   «scroll snap», sin librerías).
 * - Escritorio: foto principal y miniaturas debajo; cada miniatura es un botón con texto.
 * La primera foto se carga con prioridad y las demás de forma diferida (RNF de rendimiento).
 */
export function Galeria({ fotos, agotado }: { fotos: Foto[]; agotado: boolean }) {
  const [activa, setActiva] = useState(0);
  const atenuada = agotado ? "opacity-50" : "";

  if (fotos.length === 0) return <div className="aspect-square bg-superficie" />;

  return (
    <div>
      {/* Celular: carrusel deslizable */}
      <ul
        className="flex snap-x snap-mandatory overflow-x-auto md:hidden"
        aria-label="Fotos del producto"
        data-prueba="galeria-celular"
      >
        {fotos.map((foto, i) => (
          <li
            key={foto.url}
            className="relative aspect-square w-full shrink-0 snap-center bg-superficie"
          >
            <Image
              src={foto.url}
              alt={foto.textoAlternativo}
              fill
              sizes="100vw"
              loading={i === 0 ? "eager" : "lazy"}
              unoptimized={sinOptimizar(foto.url)}
              className={`object-cover ${atenuada}`}
            />
          </li>
        ))}
      </ul>
      {fotos.length > 1 && (
        <p className="mt-2 text-center text-sm text-gris md:hidden">
          Desliza para ver las {fotos.length} fotos
        </p>
      )}

      {/* Escritorio: foto principal y miniaturas */}
      <div className="hidden md:block">
        <div className="relative aspect-square bg-superficie">
          <Image
            src={fotos[activa].url}
            alt={fotos[activa].textoAlternativo}
            fill
            sizes="50vw"
            loading="eager"
            unoptimized={sinOptimizar(fotos[activa].url)}
            className={`object-cover ${atenuada}`}
          />
        </div>
        {fotos.length > 1 && (
          <ul className="mt-3 flex gap-2" aria-label="Miniaturas">
            {fotos.map((foto, i) => (
              <li key={foto.url}>
                <button
                  type="button"
                  onClick={() => setActiva(i)}
                  aria-pressed={i === activa}
                  aria-label={`Ver foto ${i + 1} de ${fotos.length}: ${foto.textoAlternativo}`}
                  className={`relative block size-16 bg-superficie ${i === activa ? "outline-2 outline-tinta" : ""}`}
                >
                  <Image
                    src={foto.url}
                    alt=""
                    fill
                    sizes="64px"
                    loading="lazy"
                    unoptimized={sinOptimizar(foto.url)}
                    className="object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
