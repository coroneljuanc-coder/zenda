import { calcularTotal } from "@/lib/carrito/precios";
import { formatearCOP } from "@/lib/formato";

const productos = (n: number) => `${n} ${n === 1 ? "producto" : "productos"}`;

/** Subtotal, envío y total del pedido (ZTV-19, RN3). Todo con IVA incluido (D4). */
export function TotalesCompra({
  unidades,
  subtotal,
  envio,
  children,
}: {
  unidades: number;
  subtotal: number;
  envio: number;
  children?: React.ReactNode;
}) {
  return (
    <section aria-labelledby="titulo-totales" className="bg-superficie p-6">
      <h2 id="titulo-totales" className="text-xl font-extrabold">
        Tu pedido
      </h2>
      <dl className="mt-4 flex flex-col gap-2">
        <div className="flex justify-between gap-4">
          <dt>Subtotal ({productos(unidades)})</dt>
          <dd data-prueba="subtotal">{formatearCOP(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Envío</dt>
          <dd data-prueba="envio">{envio === 0 ? "Gratis" : formatearCOP(envio)}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-tinta pt-3">
          <dt className="font-extrabold">Total</dt>
          <dd className="text-2xl font-extrabold" data-prueba="total">
            {formatearCOP(calcularTotal(subtotal))}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-sm text-gris">Precios con IVA incluido.</p>
      {children}
    </section>
  );
}
