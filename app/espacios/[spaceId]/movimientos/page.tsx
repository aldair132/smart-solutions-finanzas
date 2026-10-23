import { MovementsView } from "@/components/MovementsView";
export default async function Page({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return <MovementsView key={spaceId} spaceId={spaceId} />;
}
