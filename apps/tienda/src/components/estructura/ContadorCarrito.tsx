import { cookies } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { obtenerBD } from "@/lib/bd";
import { contarUnidades } from "@/lib/carrito/carrito";
import { COOKIE_CARRITO } from "@/lib/carrito/cookie";

/**
 * Contador del encabezado (ZTV-16): lee la cookie del carrito y suma sus unidades. Depende de
 * cada visitante, así que el encabezado lo carga aparte (dentro de un `Suspense`) y mientras
 * tanto muestra la bolsa sin número.
 */
export async function ContadorCarrito() {
  // Marca que esto ocurre al atender cada visita, nunca al preparar la página por adelantado:
  // contar exige comparar el vencimiento del carrito con la hora actual (RN5).
  await connection();
  const token = (await cookies()).get(COOKIE_CARRITO)?.value;
  const unidades = await contarUnidades(obtenerBD(), token);
  return <EnlaceCarrito unidades={unidades} />;
}

/**
 * Enlace al carrito con la bolsa y un círculo con las unidades; el círculo se oculta si es 0.
 * El lector de pantalla oye «Carrito: N productos».
 */
export function EnlaceCarrito({ unidades }: { unidades: number | null }) {
  const n = unidades ?? 0;
  return (
    <Link
      href="/carrito"
      className="relative flex min-h-11 min-w-11 items-center justify-center justify-self-end"
      aria-label={`Carrito: ${n} ${n === 1 ? "producto" : "productos"}`}
      data-prueba="carrito"
    >
      <IconoBolsa />
      {n > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0 flex min-w-5 items-center justify-center bg-tinta px-1 text-xs leading-5 font-semibold text-blanco"
          data-prueba="carrito-unidades"
        >
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}

function IconoBolsa() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
    >
      <path d="M5 8h14l-1 13H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
