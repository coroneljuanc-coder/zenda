import type { ReactNode } from "react";
import type { PaginaProductos } from "@/lib/catalogo/productos";
import { Paginacion } from "./Paginacion";
import { TarjetaProducto } from "./TarjetaProducto";

const CLASES_CUADRICULA = "mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4";

/**
 * Cuadrícula de productos con paginación, compartida por el inicio (ZTV-11) y las categorías
 * (ZTV-12). Si no hay productos, muestra `vacio`.
 */
export function CuadriculaProductos({
  datos,
  ruta,
  vacio,
}: {
  datos: PaginaProductos;
  ruta: string;
  vacio: ReactNode;
}) {
  const { productos, pagina, totalPaginas } = datos;
  if (productos.length === 0) return <div className="mt-6">{vacio}</div>;

  return (
    <>
      <ul className={CLASES_CUADRICULA}>
        {productos.map((producto, indice) => (
          <TarjetaProducto key={producto.slug} producto={producto} prioritaria={indice < 4} />
        ))}
      </ul>
      <Paginacion pagina={pagina} totalPaginas={totalPaginas} ruta={ruta} />
    </>
  );
}

/** Lo que se ve mientras llegan los productos. */
export function CuadriculaCargando() {
  return (
    <div className={CLASES_CUADRICULA} aria-busy="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <div className="aspect-square bg-superficie" />
          <div className="mt-2 h-4 w-3/4 bg-superficie" />
          <div className="mt-2 h-4 w-1/3 bg-superficie" />
        </div>
      ))}
      <p className="sr-only">Cargando productos…</p>
    </div>
  );
}
