import { ProfileView } from "@/components/ProfileView";
export default async function Page({
  params,
}: {
  params: Promise<{ spaceId: string }>;
}) {
  const { spaceId } = await params;
  return <ProfileView key={spaceId} spaceId={spaceId} />;
}
