"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * Enlace a una categoría del menú. Si el visitante está en esa categoría, se resalta
 * (RN2 de ZTV-12, ZTV-47) y lo anuncia a los lectores de pantalla con `aria-current="page"`.
 */
export function EnlaceCategoria({
  slug,
  className = "",
  children,
  ...resto
}: Omit<ComponentProps<typeof Link>, "href"> & { slug: string }) {
  const ruta = `/categoria/${slug}`;
  const activa = usePathname() === ruta;
  return (
    <Link
      {...resto}
      href={ruta}
      aria-current={activa ? "page" : undefined}
      className={`${className} ${activa ? "font-extrabold underline underline-offset-4" : ""}`}
    >
      {children}
    </Link>
  );
}
