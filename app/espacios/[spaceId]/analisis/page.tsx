import { AnalysisView } from "@/components/AnalysisView";
export default async function Page({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return <AnalysisView key={spaceId} spaceId={spaceId} />;
}
