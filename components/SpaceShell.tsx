"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AssistantDialog } from "./AssistantDialog";
import { useDemo } from "./DemoProvider";
import { Icon, type IconName } from "./Icon";
import { SpaceSelector } from "./SpaceSelector";
export function SpaceShell({
  spaceId,
  children,
}: {
  spaceId: string;
  children: ReactNode;
}) {
  const { spaces, isReady } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const space = spaces.find((item) => item.id === spaceId);
  const suffix =
    ["/movimientos", "/analisis", "/credito", "/fiados", "/perfil"].find(
      (item) => pathname.endsWith(item),
    ) ?? "";
  // Solo admitimos destinos internos conocidos, nunca una URL arbitraria.
  const returnSection =
    searchParams.get("from") === "credito" ? "/credito" : "";
  const returnHref = `/espacios/${spaceId}${returnSection}`;
  const tabs: { label: string; suffix: string; icon: IconName }[] = [
    { label: "Inicio", suffix: "", icon: "home" },
    { label: "Movimientos", suffix: "/movimientos", icon: "receipt" },
    { label: "Análisis", suffix: "/analisis", icon: "chart" },
    { label: "Crédito", suffix: "/credito", icon: "shield" },
    { label: "Perfil", suffix: "/perfil", icon: "user" },
  ];
  if (!isReady)
    return (
      <main className="page" aria-busy="true">
        Cargando tu espacio…
      </main>
    );
  if (!space)
    return (
      <main className="page empty-state">
        <h1>No encontramos este espacio</h1>
        <Link className="button outline" href="/">
          Volver a mis espacios
        </Link>
      </main>
    );
  return (
    <main className="page space-page">
      <div className="space-top">
        <Link
          className="back-link"
          href={suffix === "/fiados" ? returnHref : "/"}
          replace={suffix === "/fiados"}
        >
          <Icon name="back" />
          {suffix === "/fiados" ? "Volver" : "Mis espacios"}
        </Link>
        <SpaceSelector
          spaces={spaces}
          selectedSpace={space}
          onSelect={(selectedId) => {
            const query = new URLSearchParams();
            if (suffix === "/movimientos") {
              query.set("period", searchParams.get("period") ?? "today");
              if (searchParams.get("month")) {
                query.set("month", searchParams.get("month")!);
              }
            }
            if (suffix === "/fiados" && returnSection) {
              query.set("from", "credito");
            }
            router.push(
              `/espacios/${selectedId}${suffix}${query.size ? `?${query}` : ""}`,
            );
          }}
        />
        {suffix === "/fiados" && (
          <Link className="back-link" href="/">
            Mis espacios
          </Link>
        )}
        <span className="space-date">Viernes, 23 de octubre de 2026</span>
      </div>
      {children}
      <p className="demo-note">
        Datos de ejemplo · Tus cambios se guardan en este dispositivo.
      </p>
      <button
        className="assistant-fab"
        onClick={() => setIsAssistantOpen(true)}
      >
        <Icon name="help" />
        <span>Pregúntale a Smart</span>
      </button>
      {isAssistantOpen && (
        <AssistantDialog
          spaceId={spaceId}
          onClose={() => setIsAssistantOpen(false)}
        />
      )}
      <nav className="bottom-tabs" aria-label="Navegación del espacio">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={`/espacios/${spaceId}${tab.suffix}`}
            className={suffix === tab.suffix ? "active" : ""}
            aria-current={suffix === tab.suffix ? "page" : undefined}
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
