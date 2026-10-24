import { ReceivablesView } from "@/components/ReceivablesView";
export default async function Page({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return <ReceivablesView key={spaceId} spaceId={spaceId} />;
}
