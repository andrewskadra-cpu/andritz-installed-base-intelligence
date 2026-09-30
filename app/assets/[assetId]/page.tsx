import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssetWorkspace } from "@/components/asset/AssetWorkspace";
import { getAssetPageData, getAssetRecords } from "@/lib/installed-base";

export async function generateMetadata({ params }: PageProps<"/assets/[assetId]">): Promise<Metadata> {
  const records = await getAssetRecords((await params).assetId);
  return { title: records?.asset.name ?? "Asset not found" };
}

export default async function AssetPage({ params }: PageProps<"/assets/[assetId]">) {
  const { assetId } = await params;
  const data = await getAssetPageData(assetId);
  if (!data) notFound();

  return (
    <Suspense fallback={<div className="p-8 text-sm text-ink-3">Loading asset…</div>}>
      <AssetWorkspace records={data.records} recentTelemetry={data.recentTelemetry} />
    </Suspense>
  );
}
