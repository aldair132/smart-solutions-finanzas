import { CreditView } from "@/components/CreditView";
export default async function Page({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return <CreditView key={spaceId} spaceId={spaceId} />;
}
