import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { obtenerBD } from "@/lib/bd";
import { formatearCOP } from "@/lib/formato";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false, follow: false } };

const TEXTO_ESTADO = {
  PENDIENTE_PAGO:
    "Estamos esperando la confirmación de Mercado Pago. Vuelve a cargar esta página en unos segundos.",
  PAGADO: "¡Pago aprobado! Recibimos tu pedido.",
  PAGO_RECHAZADO:
    "El pago no fue aprobado. Tu carrito sigue guardado para que lo intentes de nuevo.",
  CANCELADO: "Este pedido fue cancelado.",
  REQUIERE_REVISION: "Estamos revisando tu pago. Te contactaremos pronto.",
} as const;

/**
 * Página a la que Mercado Pago devuelve al cliente (ZTV-20 y ZTV-86). Versión básica: muestra la referencia y el
 * estado guardado del pedido. La experiencia completa del resultado llega con ZTV-22 (Sprint 4).
 * Solo se ve con la referencia y el token aleatorio del pedido: no expone datos de otros.
 */
export default function PaginaResultado({ searchParams }: PageProps<"/pedido/resultado">) {
  return (
    <Suspense
      fallback={
        <p role="status" className="text-gris">
          Cargando…
        </p>
      }
    >
      <Resultado searchParams={searchParams} />
    </Suspense>
  );
}

async function Resultado({ searchParams }: Pick<PageProps<"/pedido/resultado">, "searchParams">) {
  await connection();
  const { ref, t } = await searchParams;
  if (typeof ref !== "string" || typeof t !== "string") notFound();
  const pedido = await obtenerBD().pedido.findFirst({
    where: { referencia: ref, tokenAcceso: t },
    select: { referencia: true, estado: true, total: true },
  });
  if (!pedido) notFound();

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-extrabold tracking-tight">Tu pedido</h1>
      <p className="mt-6 text-lg font-semibold" role="status" data-prueba="estado-pedido">
        {TEXTO_ESTADO[pedido.estado]}
      </p>
      <dl className="mt-6 flex flex-col gap-2">
        <div className="flex justify-between gap-4">
          <dt>Referencia</dt>
          <dd className="font-semibold" data-prueba="referencia">
            {pedido.referencia}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Total</dt>
          <dd className="font-semibold">{formatearCOP(pedido.total)}</dd>
        </div>
      </dl>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center bg-tinta px-6 font-semibold text-blanco"
      >
        Seguir comprando
      </Link>
    </div>
  );
}
