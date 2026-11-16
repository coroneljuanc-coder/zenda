import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zenda – Servicio de Notificaciones",
  description: "Servicio interno de Zenda que envía los correos.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
