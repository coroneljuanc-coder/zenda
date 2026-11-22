import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after, connection } from "next/server";
import { Suspense } from "react";
import { EsperaConfirmacion } from "@/components/compra/EsperaConfirmacion";
import { obtenerBD } from "@/lib/bd";
import { consultarPago, leerConfigMercadoPago } from "@/lib/compra/mercadopago";
import {
  consultarResultado,
  enmascararCelular,
  idPagoDeRegreso,
  type PedidoResultado,
} from "@/lib/compra/resultado";
import { entregarEventosPendientes, leerConfigEventos } from "@/lib/eventos/bandeja";
import { formatearCOP } from "@/lib/formato";
import { TEXTOS_RESULTADO } from "@/lib/compra/mensajes";

// Seguridad (ZTV-22): la página no se indexa en buscadores.
export const metadata: Metadata = { title: "Tu pedido", robots: { index: false, follow: false } };

/**
 * Resultado del pago para el cliente (ZTV-22). Mercado Pago devuelve aquí al cliente con la
 * referencia (`ref`), el token de acceso (`t`) y el id del pago. Solo se ve con la referencia y el
 * token correctos (RN1); si no, la página «No encontramos esta página».
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
  const parametros = await searchParams;
  const { ref, t } = parametros;
  if (typeof ref !== "string" || typeof t !== "string") notFound();

  const bd = obtenerBD();
  const config = leerConfigMercadoPago();
  const r = await consultarResultado(
    bd,
    { referencia: ref, token: t, idPago: idPagoDeRegreso(parametros) },
    config ? (id) => consultarPago(config, id) : null,
  );
  if (!r) notFound();

  // Si la consulta de respaldo (RN2) dejó el pedido pagado, se entrega el evento para los correos.
  const configEventos = leerConfigEventos();
  if (r.actualizado && configEventos) {
    after(async () => {
      await entregarEventosPendientes(bd, configEventos);
    });
  }

  const { pedido } = r;
  if (pedido.estado === "PAGADO") return <Aprobado pedido={pedido} />;
  if (pedido.estado === "PENDIENTE_PAGO") {
    return (
      <Estado icono="⏱" titulo={TEXTOS_RESULTADO.pendiente} referencia={pedido.referencia}>
        <EsperaConfirmacion />
      </Estado>
    );
  }
  if (pedido.estado === "REQUIERE_REVISION") {
    return <Estado icono="!" titulo={TEXTOS_RESULTADO.revision} referencia={pedido.referencia} />;
  }
  return (
    <Estado icono="!" titulo={TEXTOS_RESULTADO.rechazado} referencia={pedido.referencia}>
      <Link
        href="/carrito"
        className="mt-6 inline-flex min-h-12 items-center bg-tinta px-6 font-semibold text-blanco"
      >
        Intentar de nuevo
      </Link>
    </Estado>
  );
}

/** Ícono + texto: el estado nunca depende solo del color (accesibilidad). */
function Estado({
  icono,
  titulo,
  referencia,
  children,
}: {
  icono: string;
  titulo: string;
  referencia: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="max-w-xl">
      <p aria-hidden="true" className="text-4xl font-extrabold">
        {icono}
      </p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight" data-prueba="estado-pedido">
        {titulo}
      </h1>
      <p className="mt-4">
        Pedido <span data-prueba="referencia">{referencia}</span>
      </p>
      {children}
    </div>
  );
}

function Aprobado({ pedido }: { pedido: PedidoResultado }) {
  const nombre = pedido.nombreCompleto.split(" ")[0];
  return (
    <div className="max-w-xl">
      <p aria-hidden="true" className="text-4xl font-extrabold">
        ✓
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight" data-prueba="estado-pedido">
        ¡Gracias por tu compra, {nombre}!
      </h1>
      <p className="mt-4 text-lg">
        Tu pedido <strong data-prueba="referencia">{pedido.referencia}</strong> fue confirmado
      </p>

      <h2 className="mt-8 text-xl font-extrabold">Resumen</h2>
      <ul className="mt-2 flex flex-col">
        {pedido.lineas.map((l, i) => (
          <li key={i} className="flex justify-between gap-4 border-b border-linea py-3">
            <span>
              {l.nombreProducto}
              {l.descripcionVariante ? ` (${l.descripcionVariante})` : ""}
              <span className="block text-gris">
                {l.cantidad} × {formatearCOP(l.precioUnitario)}
              </span>
            </span>
            <span className="font-semibold">{formatearCOP(l.totalLinea)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 flex flex-col gap-1">
        <div className="flex justify-between gap-4">
          <dt>Subtotal</dt>
          <dd>{formatearCOP(pedido.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Envío</dt>
          <dd>{pedido.envio === 0 ? "Gratis" : formatearCOP(pedido.envio)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-lg font-extrabold">
          <dt>Total pagado</dt>
          <dd data-prueba="total">{formatearCOP(pedido.total)}</dd>
        </div>
      </dl>

      <h2 className="mt-8 text-xl font-extrabold">Entrega</h2>
      <p className="mt-2">
        {pedido.direccion}
        {pedido.detalles ? `, ${pedido.detalles}` : ""}
        <br />
        {pedido.ciudad}, {pedido.departamento}
        <br />
        Celular: {enmascararCelular(pedido.celular)}
      </p>

      <p className="mt-6" data-prueba="aviso-correo">
        Te enviamos la confirmación a {pedido.correo}
      </p>
      <p className="mt-1 text-sm text-gris">
        Tienda de pruebas: por ahora los correos llegan al correo de la tienda.
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex min-h-12 items-center bg-tinta px-6 font-semibold text-blanco"
      >
        Seguir comprando
      </Link>
    </div>
  );
}
