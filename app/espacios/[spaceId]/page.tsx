import { SpaceHome } from "@/components/SpaceHome";

// Los datos viven en el navegador (localStorage): no hay contenido que validar en servidor.
export const instant = false;
export default async function Page({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return <SpaceHome key={spaceId} spaceId={spaceId} />;
}
