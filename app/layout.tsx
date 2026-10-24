import type { Metadata } from "next";
import { DemoProvider } from "@/components/DemoProvider";
import "./globals.css";
export const metadata: Metadata = {
  title: "Smart Solutions · Finanzas por voz e imagen",
  description:
    "Asistente de IA que registra por voz y foto las ventas y gastos de pequeños negocios y los convierte en un historial para acceder a crédito.",
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
              s<span>s</span>
            </span>
            <span>
              Smart Solutions
              <span className="brand-caption">
                Habla, toma una foto y ordena tu negocio.
              </span>
            </span>
            <span className="demo-badge">
              <span />
              Datos de ejemplo
            </span>
          </header>
          {children}
        </DemoProvider>
      </body>
    </html>
  );
}
