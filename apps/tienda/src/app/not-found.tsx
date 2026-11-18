import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/**
 * Página para direcciones que no existen (ZTV-10, escenario 3; ZTV-36).
 * También la usan la categoría y el producto inexistentes (CAT-03-CP4 y CAT-04-CP5).
 * Se muestra dentro de la estructura común, así el visitante sigue teniendo el menú.
 */
export default function NoEncontrada() {
  return (
    <section className="py-8">
      <p className="text-sm text-gris">Error 404</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">No encontramos esta página</h1>
      <p className="mt-3 max-w-prose text-gris">
        Puede que la dirección esté mal escrita o que la página ya no exista. Puedes volver al
        inicio o elegir una categoría del menú.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-12 items-center bg-tinta px-6 font-medium text-blanco hover:bg-gris"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
