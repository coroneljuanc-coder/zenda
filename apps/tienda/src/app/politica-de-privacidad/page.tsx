import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidad" };

/**
 * Política de tratamiento de datos personales (ZTV-19, Ley 1581 de 2012). Texto básico de
 * plantilla para la etapa de pruebas: el PO lo revisa en la Sprint Review y, antes de vender de
 * verdad, debe validarlo con un asesor legal y completar los datos del responsable.
 */
export default function PaginaPolitica() {
  return (
    <article className="max-w-2xl">
      <h1 className="text-3xl font-extrabold tracking-tight">Política de privacidad</h1>
      <p className="mt-2 text-sm text-gris">
        Versión de prueba · Última actualización: 22 de noviembre de 2026
      </p>

      <div className="mt-6 flex flex-col gap-6 leading-relaxed">
        <section>
          <h2 className="text-xl font-extrabold">Quién trata tus datos</h2>
          <p className="mt-2">
            Zenda, tienda virtual en etapa de pruebas, es responsable del tratamiento de los datos
            personales que nos entregas al comprar. Mientras la tienda esté en pruebas no se
            realizan cobros reales.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold">Qué datos pedimos y para qué</h2>
          <p className="mt-2">
            Tu nombre, correo, celular y dirección de entrega. Los usamos solo para procesar tu
            pedido, entregarlo y contactarte sobre él (por ejemplo, para confirmar la compra o
            avisarte un cambio de estado). No los vendemos ni los usamos para publicidad sin tu
            autorización.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold">Pagos</h2>
          <p className="mt-2">
            Los pagos los procesa la pasarela Mercado Pago. Zenda nunca ve ni guarda los datos de tu
            tarjeta o de tu cuenta bancaria.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold">Cuánto tiempo los guardamos</h2>
          <p className="mt-2">
            Los datos de un carrito sin comprar se borran a los 30 días. Los de un pedido se
            conservan el tiempo que exijan las normas comerciales y tributarias.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-extrabold">Tus derechos</h2>
          <p className="mt-2">
            De acuerdo con la Ley 1581 de 2012, puedes conocer, actualizar, rectificar y pedir que
            se borren tus datos, revocar tu autorización y presentar quejas ante la Superintendencia
            de Industria y Comercio.
          </p>
        </section>
      </div>
    </article>
  );
}
