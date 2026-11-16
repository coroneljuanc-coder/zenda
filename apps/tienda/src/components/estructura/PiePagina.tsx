import { TEXTO_DERECHOS, TEXTO_PIE_PRUEBAS, TIENDA_DE_PRUEBAS } from "@/lib/tienda";

/** Pie de página común (ZTV-10, escenario 1 y RN3). */
export function PiePagina() {
  return (
    <footer className="mt-auto border-t border-linea">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-gris sm:flex-row sm:justify-between">
        <p>{TEXTO_DERECHOS}</p>
        {TIENDA_DE_PRUEBAS && <p>{TEXTO_PIE_PRUEBAS}</p>}
      </div>
    </footer>
  );
}
