import { formatearCOP } from "@/lib/formato";

/**
 * Botón «Pagar $ X» del resumen final (ZTV-19). El pago con Wompi se conecta en ZTV-20.
 */
export function BotonPagar({ total }: { total: number }) {
  return (
    <>
      <button
        type="button"
        disabled
        className="min-h-12 w-full bg-tinta px-6 font-semibold text-blanco disabled:bg-linea disabled:text-gris"
      >
        Pagar {formatearCOP(total)}
      </button>
      <p className="mt-2 text-center text-sm text-gris">Próximamente: pago con Wompi.</p>
    </>
  );
}
