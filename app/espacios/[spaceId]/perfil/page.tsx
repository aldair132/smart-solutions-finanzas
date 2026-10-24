import { ProfileView } from "@/components/ProfileView";

// Los datos viven en el navegador (localStorage): no hay contenido que validar en servidor.
export const instant = false;
export default async function Page({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return <ProfileView key={spaceId} spaceId={spaceId} />;
}
