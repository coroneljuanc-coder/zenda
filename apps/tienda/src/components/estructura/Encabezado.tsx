import Link from "next/link";
import { Suspense } from "react";
import { Buscador } from "./Buscador";
import { ContadorCarrito, EnlaceCarrito } from "./ContadorCarrito";
import { EnlaceCategoria } from "./EnlaceCategoria";
import { listarCategoriasMenu } from "@/lib/catalogo/menu";
import { MenuCelular } from "./MenuCelular";

/**
 * Encabezado común (ZTV-10, escenario 1). El logo siempre lleva al inicio (RN2).
 * Menú de categorías desde la base de datos, en el orden del campo `orden` (RN1, ZTV-35):
 * en escritorio se ve en línea; en celular se abre con el botón «Menú».
 * La bolsa lleva al carrito y muestra cuántas unidades tiene (ZTV-16).
 * Buscador (ZTV-14): en escritorio, a la vista; en celular, se abre con la lupa.
 */
export async function Encabezado() {
  const categorias = await listarCategoriasMenu();

  return (
    <header className="relative border-b border-linea">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 md:flex md:justify-between">
        <MenuCelular categorias={categorias} />
        <Link
          href="/"
          className="text-[1.75rem] leading-none font-extrabold tracking-[-0.04em]"
          aria-label="Zenda, ir al inicio"
        >
          zenda
        </Link>
        <nav aria-label="Categorías" className="hidden md:block">
          <ul className="flex gap-6 text-sm">
            {categorias.map((categoria) => (
              <li key={categoria.slug}>
                <EnlaceCategoria
                  slug={categoria.slug}
                  className="flex min-h-11 items-center underline-offset-4 hover:underline"
                >
                  {categoria.nombre}
                </EnlaceCategoria>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2 justify-self-end">
          <Buscador variante="escritorio" />
          <Buscador variante="celular" />
          <Suspense fallback={<EnlaceCarrito unidades={null} />}>
            <ContadorCarrito />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
