import { SpaceHome } from "@/components/SpaceHome";
export default async function Page({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return <SpaceHome key={spaceId} spaceId={spaceId} />;
}
