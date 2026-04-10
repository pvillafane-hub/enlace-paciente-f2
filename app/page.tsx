export const dynamic = "force-dynamic";

import LandingClient from "./LandingClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const params = await searchParams;

  return <LandingClient auth={params?.auth} />;
}