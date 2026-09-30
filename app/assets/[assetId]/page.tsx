import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssetWorkspace } from "@/components/asset/AssetWorkspace";
import { getAssetContext } from "@/lib/installed-base";

export async function generateMetadata({ params }: PageProps<"/assets/[assetId]">): Promise<Metadata> {
  const context = await getAssetContext((await params).assetId);
  return { title: context?.asset.name ?? "Asset not found" };
}

export default async function AssetPage({ params }: PageProps<"/assets/[assetId]">) {
  const { assetId } = await params;
  const context = await getAssetContext(assetId);
  if (!context) notFound();

  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-3">Loading asset…</div>}>
      <AssetWorkspace context={context} />
    </Suspense>
  );
}
