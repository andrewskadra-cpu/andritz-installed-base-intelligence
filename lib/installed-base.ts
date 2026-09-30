/**
 * Installed-base query layer.
 *
 * Pages call only these functions. They are async so that swapping the demo
 * dataset for Supabase queries does not change any call site.
 */

import * as demo from "@/data/demo-data";
import type {
  Asset,
  AssetContext,
  Customer,
  HealthStatus,
  Plant,
  PlantUnit,
  SearchEntry,
} from "@/types/installed-base";

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

export async function getAssetsForUnits(unitIds: string[]): Promise<Asset[]> {
  return demo.assets.filter((a) => unitIds.includes(a.unitId));
}

export async function getAssetsForPlant(plantId: string): Promise<Asset[]> {
  const units = await getUnitsForPlant(plantId);
  return getAssetsForUnits(units.map((u) => u.id));
}

/** Count of active conditions per asset id. */
export async function getConditionCounts(assetIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const id of assetIds) counts[id] = 0;
  for (const c of demo.conditions) {
    if (c.assetId in counts) counts[c.assetId] += 1;
  }
  return counts;
}

export async function getAssetContext(assetId: string): Promise<AssetContext | null> {
  const asset = demo.assets.find((a) => a.id === assetId);
  if (!asset) return null;
  const unit = demo.plantUnits.find((u) => u.id === asset.unitId);
  const plant = unit && demo.plants.find((p) => p.id === unit.plantId);
  const customer = plant && demo.customers.find((c) => c.id === plant.customerId);
  if (!unit || !plant || !customer) return null;

  const assemblies = demo.assemblies.filter((a) => a.assetId === assetId);
  const assemblyIds = new Set(assemblies.map((a) => a.id));
  const sensorChannels = demo.sensorChannels.filter((c) => c.assetId === assetId);
  const channelIds = new Set(sensorChannels.map((c) => c.id));

  return {
    customer,
    plant,
    unit,
    asset,
    assemblies,
    components: demo.components.filter((c) => assemblyIds.has(c.assemblyId)),
    conditions: demo.conditions.filter((c) => c.assetId === assetId),
    recommendations: demo.recommendations.filter((r) => r.assetId === assetId),
    sensorChannels,
    sensorReadings: demo.sensorReadings.filter((r) => channelIds.has(r.channelId)),
    serviceEvents: demo.serviceEvents.filter((e) => e.assetId === assetId),
    documents: demo.documents.filter((d) => d.assetId === assetId),
    parts: demo.parts.filter((p) => p.assetId === assetId),
  };
}

export function summarizeHealth(statuses: HealthStatus[]): Record<HealthStatus, number> {
  const summary: Record<HealthStatus, number> = { healthy: 0, attention: 0, critical: 0, unknown: 0 };
  for (const s of statuses) summary[s] += 1;
  return summary;
}

export async function getCustomerSummary(customerId: string) {
  const plants = await getPlantsForCustomer(customerId);
  const assetLists = await Promise.all(plants.map((p) => getAssetsForPlant(p.id)));
  const assets = assetLists.flat();
  return {
    plantCount: plants.length,
    assetCount: assets.length,
    health: summarizeHealth(assets.map((a) => a.status)),
  };
}

/** Assets not in a healthy state, most severe first. */
export async function getWatchlist(): Promise<Asset[]> {
  const rank: Record<HealthStatus, number> = { critical: 0, attention: 1, unknown: 2, healthy: 3 };
  return demo.assets
    .filter((a) => a.status !== "healthy")
    .sort((a, b) => rank[a.status] - rank[b.status]);
}

/** Flat index of every searchable installed-base record. */
export async function getSearchIndex(): Promise<SearchEntry[]> {
  const entries: SearchEntry[] = [];
  const plantName = (id: string) => demo.plants.find((p) => p.id === id)?.name ?? "";
  const customerName = (id: string) => demo.customers.find((c) => c.id === id)?.name ?? "";
  const unitById = (id: string) => demo.plantUnits.find((u) => u.id === id);
  const assetById = (id: string) => demo.assets.find((a) => a.id === id);

  for (const c of demo.customers) {
    entries.push({
      id: c.id,
      kind: "customer",
      title: c.name,
      subtitle: `${c.industry} · ${c.region}`,
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
      subtitle: customerName(p.customerId),
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
      subtitle: plantName(u.plantId),
      href: `/plants/${u.plantId}#${u.id}`,
      status: null,
      keywords: `${u.name} ${u.unitType} ${plantName(u.plantId)}`,
    });
  }
  for (const a of demo.assets) {
    const unit = unitById(a.unitId);
    entries.push({
      id: a.id,
      kind: "asset",
      title: a.name,
      subtitle: `${a.equipmentType} · ${unit?.name ?? ""} · ${unit ? plantName(unit.plantId) : ""}`,
      href: `/assets/${a.id}`,
      status: a.status,
      keywords: `${a.name} ${a.model} ${a.serialNumber} ${a.equipmentType} ${a.productLine}`,
    });
  }
  for (const a of demo.assemblies) {
    const asset = assetById(a.assetId);
    entries.push({
      id: a.id,
      kind: "assembly",
      title: a.name,
      subtitle: asset?.name ?? "",
      href: `/assets/${a.assetId}?node=${a.id}`,
      status: a.status,
      keywords: `${a.name} ${asset?.name ?? ""}`,
    });
  }
  for (const c of demo.components) {
    const assembly = demo.assemblies.find((a) => a.id === c.assemblyId);
    const asset = assembly && assetById(assembly.assetId);
    entries.push({
      id: c.id,
      kind: "component",
      title: c.name,
      subtitle: `${c.partNumber} · ${assembly?.name ?? ""} · ${asset?.name ?? ""}`,
      href: `/assets/${asset?.id}?node=${c.id}`,
      status: c.status,
      keywords: `${c.name} ${c.partNumber} ${asset?.name ?? ""}`,
    });
  }
  return entries;
}
