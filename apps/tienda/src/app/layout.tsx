import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { BannerPruebas } from "@/components/estructura/BannerPruebas";
import { Encabezado } from "@/components/estructura/Encabezado";
import { PiePagina } from "@/components/estructura/PiePagina";
import { SaltarAlContenido } from "@/components/estructura/SaltarAlContenido";
import "./globals.css";

/** Letra de la dirección «Vitrina» (ZTV-33). Se descarga al compilar y se sirve desde Zenda. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Zenda", template: "%s · Zenda" },
  description: "Zenda, tienda virtual con productos de todo tipo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CO" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <SaltarAlContenido />
        <BannerPruebas />
        <Encabezado />
        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <PiePagina />
      </body>
    </html>
  );
}
