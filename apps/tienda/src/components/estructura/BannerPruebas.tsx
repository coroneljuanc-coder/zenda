import { TEXTO_BANNER_PRUEBAS, TIENDA_DE_PRUEBAS } from "@/lib/tienda";

/** Banner superior mientras la tienda muestre productos de ejemplo (D8). */
export function BannerPruebas() {
  if (!TIENDA_DE_PRUEBAS) return null;
  return (
    <div role="note" className="bg-tinta px-4 py-2 text-center text-sm text-blanco">
      {TEXTO_BANNER_PRUEBAS}
    </div>
  );
}
