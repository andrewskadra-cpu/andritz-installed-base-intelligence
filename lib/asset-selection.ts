/**
 * Resolves the selected hierarchy node on the asset page and scopes the
 * asset's data to it. All functions are generic over hierarchy depth.
 */

import { SIGNAL_ORDER } from "@/lib/telemetry/signals";
import { signalsForZones } from "@/lib/telemetry/health-engine";
import type { DocumentKind, ViewerZone } from "@/types/installed-base";
import type { TelemetrySignalKey } from "@/types/telemetry";
import { pathTo, subtreeIds, type AssetModel, type HierarchyNode } from "./asset-model";

export interface Selection {
  node: HierarchyNode;
  /** Asset root down to the selected node. */
  path: HierarchyNode[];
  /** Selected node plus every descendant id. */
  scopeIds: Set<string>;
  /** Zones to emphasise in the viewer; null means the whole asset is in focus. */
  focusZones: Set<ViewerZone> | null;
  /** Ancestor zones kept visible as parent context. */
  contextZones: Set<ViewerZone>;
  /** Set when the node has no geometry/monitoring of its own and is shown through this ancestor. */
  monitoredVia: HierarchyNode | null;
}

export function resolveSelection(model: AssetModel, selectedId: string | null): Selection {
  const node = (selectedId && model.nodes[selectedId]) || model.nodes[model.rootId];
  const path = pathTo(model, node.id);
  const scopeIds = subtreeIds(model, node.id);

  let focusZones: Set<ViewerZone> | null = null;
  const contextZones = new Set<ViewerZone>();
  let monitoredVia: HierarchyNode | null = null;
  if (node.type !== "asset") {
    focusZones = new Set([...scopeIds].flatMap((id) => (model.nodes[id].zone ? [model.nodes[id].zone!] : [])));
    // A node without its own geometry is shown through its nearest ancestor.
    const ancestors = path.slice(0, -1).reverse();
    if (focusZones.size === 0) {
      monitoredVia = ancestors.find((a) => a.zone) ?? null;
      if (monitoredVia?.zone) focusZones.add(monitoredVia.zone);
    }
    for (const a of ancestors) if (a.zone && !focusZones.has(a.zone)) contextZones.add(a.zone);
  }

  return { node, path, scopeIds, focusZones, contextZones, monitoredVia };
}

export function scopeConditions(model: AssetModel, sel: Selection) {
  return model.conditions.filter((c) => sel.scopeIds.has(c.entityId));
}

export function scopeRecommendations(model: AssetModel, sel: Selection) {
  return model.recommendations.filter((r) => sel.scopeIds.has(r.entityId));
}

export function scopeSignals(sel: Selection): TelemetrySignalKey[] {
  return sel.focusZones === null ? SIGNAL_ORDER : signalsForZones(sel.focusZones);
}

export function scopeServiceEvents(model: AssetModel, sel: Selection) {
  return model.records.serviceEvents
    .filter((e) => sel.scopeIds.has(e.entityId))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Records attached to the selected node. When the node has none, falls back to
 * the nearest ancestor that does and reports which one.
 */
function nearestAttached<T extends { entityId: string }>(items: T[], sel: Selection) {
  for (const node of [...sel.path].reverse()) {
    const own = items.filter((i) => i.entityId === node.id);
    if (own.length > 0) return { items: own, inheritedFrom: node.id === sel.node.id ? null : node };
  }
  return { items: [] as T[], inheritedFrom: null };
}

export function scopeDocuments(model: AssetModel, sel: Selection, kinds: DocumentKind[]) {
  return nearestAttached(
    model.records.documents.filter((d) => kinds.includes(d.kind)),
    sel,
  );
}

export function scopeParts(model: AssetModel, sel: Selection) {
  return nearestAttached(model.records.parts, sel);
}
