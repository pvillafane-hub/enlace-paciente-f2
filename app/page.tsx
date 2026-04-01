export const dynamic = "force-dynamic";

import LandingClient from "./LandingClient";

export default function Page({
  searchParams,
}: {
  searchParams: { auth?: string };
}) {
  return <LandingClient auth={searchParams?.auth} />;
}