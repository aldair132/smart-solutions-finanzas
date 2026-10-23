import type { Metadata } from "next";
import { DemoProvider } from "@/components/DemoProvider";
import "./globals.css";
export const metadata: Metadata = {
  title: "Mis espacios · Tus negocios y finanzas",
  description:
    "Tus negocios y tus finanzas, en un solo lugar. Demostración con datos de ejemplo.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <DemoProvider>
          <header className="brand-bar">
            <span className="brand-symbol">
              m<span>i</span>
            </span>
            <span>
              mis espacios
              <span className="brand-caption">
                Cada negocio, una posibilidad.
              </span>
            </span>
            <span className="demo-badge">
              <span />
              Modo demostración
            </span>
          </header>
          {children}
        </DemoProvider>
      </body>
    </html>
  );
}
