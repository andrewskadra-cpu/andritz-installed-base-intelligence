import type { Metadata } from "next";
import { LandingView } from "@/components/parts-support/LandingView";
import { getPartsContext } from "@/lib/installed-base";
import { param } from "@/lib/parts/search-params";

export const metadata: Metadata = { title: "Parts & Support" };

export default async function PartsSupportPage({ searchParams }: PageProps<"/parts-support">) {
  const sp = await searchParams;
  const context = await getPartsContext(param(sp, "asset"), param(sp, "entity"));
  return <LandingView context={context} />;
}
