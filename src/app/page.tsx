export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import LandingClient from "./LandingClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LandingClient />
    </Suspense>
  );
}