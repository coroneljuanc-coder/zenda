import Link from "next/link";

/**
 * Paginación del listado (ZTV-11, ZTV-42): «Anterior · Página 1 de 2 · Siguiente».
 * La página 1 usa la dirección limpia (sin `?pagina=1`). Cuando no hay página anterior o
 * siguiente, la palabra se muestra en gris y no es un enlace.
 */
export function Paginacion({
  pagina,
  totalPaginas,
  ruta = "/",
}: {
  pagina: number;
  totalPaginas: number;
  ruta?: string;
}) {
  if (totalPaginas <= 1) return null;
  const enlace = (n: number) => (n <= 1 ? ruta : `${ruta}?pagina=${n}`);
  const estiloEnlace = "flex min-h-11 items-center px-3 underline underline-offset-4";
  const estiloInactivo = "flex min-h-11 items-center px-3 text-gris";

  return (
    <nav aria-label="Paginación" className="mt-10 flex items-center justify-center gap-2 text-sm">
      {pagina > 1 ? (
        <Link href={enlace(pagina - 1)} className={estiloEnlace}>
          Anterior
        </Link>
      ) : (
        <span className={estiloInactivo}>Anterior</span>
      )}
      <span aria-hidden="true">·</span>
      <p aria-current="page" className="px-3">
        Página {pagina} de {totalPaginas}
      </p>
      <span aria-hidden="true">·</span>
      {pagina < totalPaginas ? (
        <Link href={enlace(pagina + 1)} className={estiloEnlace}>
          Siguiente
        </Link>
      ) : (
        <span className={estiloInactivo}>Siguiente</span>
      )}
    </nav>
  );
}
