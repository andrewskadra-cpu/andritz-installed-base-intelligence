import type { Metadata } from "next";
import { PartDetailView } from "@/components/parts-support/PartDetailView";
import { getPartsContext } from "@/lib/installed-base";
import { param } from "@/lib/parts/search-params";

export const metadata: Metadata = { title: "Part Details · Parts & Support" };

export default async function PartDetailPage({ params, searchParams }: PageProps<"/parts-support/parts/[partId]">) {
  const [{ partId }, sp] = await Promise.all([params, searchParams]);
  const context = await getPartsContext(param(sp, "asset"), param(sp, "entity"));
  return <PartDetailView key={partId} partId={decodeURIComponent(partId)} context={context} />;
}
