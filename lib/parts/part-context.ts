/**
 * Equipment context for Parts & Support. Context travels in the URL
 * (?asset=…&entity=…) so every page can link back to the asset, and is
 * copied onto basket lines when a part is added.
 */

import type { AssetRecords } from "@/types/installed-base";
import type { EquipmentContext } from "@/types/parts-commerce";

export const PARTS_SUPPORT_HOME = "/parts-support";

/** IBIS component template key -> display name (same for every IK-700 asset). */
export type ComponentNames = Record<string, string>;

export function componentName(names: ComponentNames, key: string): string {
  return names[key] ?? key;
}

export function contextFromRecords(records: AssetRecords, entityId: string | null): EquipmentContext {
  const entity = entityId ? records.entities.find((e) => e.id === entityId) ?? null : null;
  return {
    assetId: records.asset.id,
    assetName: records.asset.name,
    model: records.asset.model,
    serialNumber: records.asset.serialNumber,
    plantName: records.plant.name,
    unitName: records.unit.name,
    customerName: records.customer.name,
    entityId: entity?.id ?? null,
    entityName: entity?.name ?? null,
  };
}

/** Query string carrying the context ("" when none). */
export function contextQuery(context: Pick<EquipmentContext, "assetId" | "entityId"> | null, extra: Record<string, string> = {}) {
  const params = new URLSearchParams();
  if (context) {
    params.set("asset", context.assetId);
    if (context.entityId) params.set("entity", context.entityId);
  }
  for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function partsSupportHref(
  path: "" | "/parts" | "/basket" | "/contact" | `/parts/${string}`,
  context: Pick<EquipmentContext, "assetId" | "entityId"> | null,
  extra?: Record<string, string>,
) {
  return `${PARTS_SUPPORT_HOME}${path}${contextQuery(context, extra)}`;
}

export function assetHref(context: Pick<EquipmentContext, "assetId" | "entityId">) {
  return `/assets/${context.assetId}${context.entityId ? `?entity=${encodeURIComponent(context.entityId)}` : ""}`;
}

/** Line-level equipment snapshot (no component; that is kept as provenance). */
export function equipmentOf(context: EquipmentContext | null): Omit<EquipmentContext, "entityId" | "entityName"> | null {
  if (!context) return null;
  const { entityId: _e, entityName: _n, ...equipment } = context;
  void _e;
  void _n;
  return equipment;
}
