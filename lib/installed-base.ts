/**
 * Installed-base query layer.
 *
 * Pages call only these functions. They are async so that swapping the demo
 * dataset for Supabase queries does not change any call site. Health is never
 * read from storage: it is always derived through buildAssetModel so every
 * screen shows the same status for the same equipment.
 */

import * as demo from "@/data/demo-data";
import { buildAssetModel, nodeMetrics, sortBySeverity, type AssetModel } from "@/lib/asset-model";
import { assessHealth } from "@/lib/telemetry/health-engine";
import { fetchRecentTelemetry } from "@/lib/telemetry/telemetry-provider";
import type {
  ActiveCondition,
  Asset,
  AssetRecords,
  Customer,
  HealthStatus,
  Plant,
  PlantUnit,
  SearchEntry,
} from "@/types/installed-base";
import type { TelemetryFrame } from "@/types/telemetry";

export async function getCustomers(): Promise<Customer[]> {
  return demo.customers;
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  return demo.customers.find((c) => c.id === customerId) ?? null;
}

export async function getPlantsForCustomer(customerId: string): Promise<Plant[]> {
  return demo.plants.filter((p) => p.customerId === customerId);
}

export async function getPlant(plantId: string): Promise<Plant | null> {
  return demo.plants.find((p) => p.id === plantId) ?? null;
}

export async function getUnitsForPlant(plantId: string): Promise<PlantUnit[]> {
  return demo.plantUnits.filter((u) => u.plantId === plantId);
}

async function getAssetsForUnits(unitIds: string[]): Promise<Asset[]> {
  return demo.assets.filter((a) => unitIds.includes(a.unitId));
}

export async function getAssetRecords(assetId: string): Promise<AssetRecords | null> {
  const asset = demo.assets.find((a) => a.id === assetId);
  if (!asset) return null;
  const unit = demo.plantUnits.find((u) => u.id === asset.unitId);
  const plant = unit && demo.plants.find((p) => p.id === unit.plantId);
  const customer = plant && demo.customers.find((c) => c.id === plant.customerId);
  if (!unit || !plant || !customer) return null;

  return {
    customer,
    plant,
    unit,
    asset,
    entities: demo.assetEntities.filter((e) => e.assetId === assetId),
    serviceEvents: demo.serviceEvents.filter((e) => e.assetId === assetId),
    documents: demo.documents.filter((d) => d.assetId === assetId),
    parts: demo.parts.filter((p) => p.assetId === assetId),
  };
}

/** Stored records plus the most recent telemetry window for the asset page. */
export async function getAssetPageData(
  assetId: string,
): Promise<{ records: AssetRecords; recentTelemetry: TelemetryFrame[] } | null> {
  const records = await getAssetRecords(assetId);
  if (!records) return null;
  const recentTelemetry = await fetchRecentTelemetry({
    assetId,
    cycleCount: records.asset.recordedCycles,
  });
  return { records, recentTelemetry };
}

async function getAssetModel(assetId: string): Promise<AssetModel | null> {
  const data = await getAssetPageData(assetId);
  if (!data) return null;
  return buildAssetModel(data.records, assessHealth(data.recentTelemetry));
}

export interface AssetSummary {
  asset: Asset;
  status: HealthStatus;
  cycles: number;
  lastService: string | null;
  conditionCount: number;
  /** Most severe active condition and the node it sits on. */
  topConcern: { condition: ActiveCondition; nodeName: string } | null;
}

function summarize(model: AssetModel): AssetSummary {
  const top = sortBySeverity(model.conditions)[0];
  return {
    asset: model.records.asset,
    status: model.nodes[model.rootId].status,
    cycles: model.currentCycles,
    lastService: nodeMetrics(model, model.rootId).lastService?.date ?? null,
    conditionCount: model.conditions.length,
    topConcern: top ? { condition: top, nodeName: model.nodes[top.entityId]?.name ?? "" } : null,
  };
}

export async function getAssetSummaries(assetIds: string[]): Promise<AssetSummary[]> {
  const models = await Promise.all(assetIds.map(getAssetModel));
  return models.filter((m): m is AssetModel => m !== null).map(summarize);
}

export async function getPlantAssetSummaries(plantId: string): Promise<AssetSummary[]> {
  const units = await getUnitsForPlant(plantId);
  const assets = await getAssetsForUnits(units.map((u) => u.id));
  return getAssetSummaries(assets.map((a) => a.id));
}

export function summarizeHealth(statuses: HealthStatus[]): Record<HealthStatus, number> {
  const summary: Record<HealthStatus, number> = { healthy: 0, attention: 0, critical: 0, unknown: 0 };
  for (const s of statuses) summary[s] += 1;
  return summary;
}

export async function getCustomerSummary(customerId: string) {
  const plants = await getPlantsForCustomer(customerId);
  const perPlant = await Promise.all(plants.map((p) => getPlantAssetSummaries(p.id)));
  const assets = perPlant.flat();
  return {
    plantCount: plants.length,
    assetCount: assets.length,
    conditionCount: assets.reduce((n, a) => n + a.conditionCount, 0),
    health: summarizeHealth(assets.map((a) => a.status)),
  };
}

/** Assets not in a healthy state, most severe first. */
export async function getWatchlist(): Promise<AssetSummary[]> {
  const summaries = await getAssetSummaries(demo.assets.map((a) => a.id));
  return sortBySeverity(summaries.filter((s) => s.status !== "healthy"));
}

/** Flat index of every searchable installed-base record. */
export async function getSearchIndex(): Promise<SearchEntry[]> {
  const entries: SearchEntry[] = [];
  const plantName = (id: string) => demo.plants.find((p) => p.id === id)?.name ?? "";
  const customerName = (id: string) => demo.customers.find((c) => c.id === id)?.name ?? "";

  for (const c of demo.customers) {
    entries.push({
      id: c.id,
      kind: "customer",
      title: c.name,
      subtitle: `Customer · ${c.industry} · ${c.region}`,
      href: `/customers/${c.id}`,
      status: null,
      keywords: `${c.name} ${c.industry}`,
    });
  }
  for (const p of demo.plants) {
    entries.push({
      id: p.id,
      kind: "plant",
      title: p.name,
      subtitle: `Plant · ${customerName(p.customerId)}`,
      href: `/plants/${p.id}`,
      status: null,
      keywords: `${p.name} ${p.plantType} ${customerName(p.customerId)}`,
    });
  }
  for (const u of demo.plantUnits) {
    entries.push({
      id: u.id,
      kind: "unit",
      title: u.name,
      subtitle: `${u.unitType} · ${plantName(u.plantId)}`,
      href: `/plants/${u.plantId}#${u.id}`,
      status: null,
      keywords: `${u.name} ${u.unitType} ${plantName(u.plantId)}`,
    });
  }

  const models = (await Promise.all(demo.assets.map((a) => getAssetModel(a.id)))).filter(
    (m): m is AssetModel => m !== null,
  );
  for (const model of models) {
    const { asset, unit, plant } = model.records;
    entries.push({
      id: asset.id,
      kind: "asset",
      title: asset.name,
      subtitle: `${asset.equipmentType} · ${unit.name} · ${plant.name}`,
      href: `/assets/${asset.id}`,
      status: model.nodes[asset.id].status,
      keywords: `${asset.name} ${asset.model} ${asset.serialNumber} ${asset.equipmentType} ${asset.productLine}`,
    });
    for (const e of model.records.entities) {
      entries.push({
        id: e.id,
        kind: e.type,
        title: e.name,
        subtitle: [e.partNumber, model.nodes[e.parentId]?.name, e.parentId === asset.id ? null : asset.name]
          .filter(Boolean)
          .join(" · "),
        href: `/assets/${asset.id}?entity=${e.id}`,
        status: model.nodes[e.id].status,
        keywords: `${e.name} ${e.partNumber ?? ""} ${asset.name}`,
      });
    }
  }
  return entries;
}
