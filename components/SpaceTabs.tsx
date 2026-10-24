import Link from "next/link";
import { Icon, type IconName } from "./Icon";

const sectionTabs: { label: string; suffix: string; icon: IconName }[] = [
  { label: "Movimientos", suffix: "/movimientos", icon: "receipt" },
  { label: "Análisis", suffix: "/analisis", icon: "chart" },
  { label: "Crédito", suffix: "/credito", icon: "shield" },
  { label: "Perfil", suffix: "/perfil", icon: "user" },
];

// Barra inferior común. En la portada «Inicio» es la portada y el resto abre
// las secciones del último negocio usado; dentro de un espacio, todo es de ese espacio.
export function SpaceTabs({
  spaceId,
  spaceName,
  activeSuffix,
}: {
  spaceId: string;
  spaceName: string;
  activeSuffix: string | null;
}) {
  const isOverview = activeSuffix === null;
  const tabs = [
    {
      label: "Inicio",
      href: isOverview ? "/" : `/espacios/${spaceId}`,
      icon: "home" as IconName,
      isActive: isOverview || activeSuffix === "",
    },
    ...sectionTabs.map((tab) => ({
      label: tab.label,
      href: `/espacios/${spaceId}${tab.suffix}`,
      icon: tab.icon,
      isActive: activeSuffix === tab.suffix,
    })),
  ];
  return (
    <nav className="bottom-tabs" aria-label="Navegación principal">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          className={tab.isActive ? "active" : ""}
          aria-current={tab.isActive ? "page" : undefined}
          title={
            tab.label === "Inicio" ? undefined : `${tab.label} · ${spaceName}`
          }
        >
          <Icon name={tab.icon} />
          <span>{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
