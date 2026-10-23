import { Suspense } from "react";
import { SpaceShell } from "@/components/SpaceShell";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return (
    <Suspense fallback={<main className="page">Cargando espacio…</main>}>
      <SpaceShell spaceId={spaceId}>{children}</SpaceShell>
    </Suspense>
  );
}
