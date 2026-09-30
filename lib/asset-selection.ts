/**
 * Pure helpers that resolve the selected hierarchy node on the asset page and
 * scope the asset's data to that node and its descendants.
 */

import type {
  AssetContext,
  HierarchyLevel,
  OperatingRecord,
  ViewerZone,
} from "@/types/installed-base";

export interface SelectedNode {
  id: string;
  level: HierarchyLevel;
  name: string;
  subtitle: string;
  record: OperatingRecord;
  /** This node plus every descendant id — used to scope data panels. */
  scopeIds: Set<string>;
  /** Ids from the asset down to this node (inclusive). */
  pathIds: string[];
  /** Viewer zone to emphasise, or null for the whole asset. */
  zone: ViewerZone | null;
}

export function resolveSelection(ctx: AssetContext, nodeId: string | null): SelectedNode {
  const component = ctx.components.find((c) => c.id === nodeId);
  if (component) {
    return {
      id: component.id,
      level: "component",
      name: component.name,
      subtitle: `Component · ${component.partNumber}`,
      record: component,
      scopeIds: new Set([component.id]),
      pathIds: [ctx.asset.id, component.assemblyId, component.id],
      zone: component.viewerZone,
    };
  }

  const assembly = ctx.assemblies.find((a) => a.id === nodeId);
  if (assembly) {
    const childIds = ctx.components.filter((c) => c.assemblyId === assembly.id).map((c) => c.id);
    return {
      id: assembly.id,
      level: "assembly",
      name: assembly.name,
      subtitle: "Assembly",
      record: assembly,
      scopeIds: new Set([assembly.id, ...childIds]),
      pathIds: [ctx.asset.id, assembly.id],
      zone: assembly.viewerZone,
    };
  }

  return {
    id: ctx.asset.id,
    level: "asset",
    name: ctx.asset.name,
    subtitle: `${ctx.asset.equipmentType} · ${ctx.asset.productLine}`,
    record: ctx.asset,
    scopeIds: new Set([
      ctx.asset.id,
      ...ctx.assemblies.map((a) => a.id),
      ...ctx.components.map((c) => c.id),
    ]),
    pathIds: [ctx.asset.id],
    zone: null,
  };
}

export function nodeName(ctx: AssetContext, id: string): string {
  if (id === ctx.asset.id) return ctx.asset.name;
  return (
    ctx.assemblies.find((a) => a.id === id)?.name ??
    ctx.components.find((c) => c.id === id)?.name ??
    id
  );
}

export function scopeConditions(ctx: AssetContext, sel: SelectedNode) {
  return ctx.conditions.filter((c) => sel.scopeIds.has(c.targetId));
}

export function scopeRecommendations(ctx: AssetContext, sel: SelectedNode) {
  return ctx.recommendations.filter((r) => sel.scopeIds.has(r.targetId));
}

export function scopeChannels(ctx: AssetContext, sel: SelectedNode) {
  if (sel.level === "asset") return ctx.sensorChannels;
  return ctx.sensorChannels.filter((c) => c.targetIds.some((id) => sel.scopeIds.has(id)));
}

export function scopeServiceEvents(ctx: AssetContext, sel: SelectedNode) {
  return ctx.serviceEvents
    .filter((e) => sel.scopeIds.has(e.targetId) || (sel.level !== "asset" && e.targetId === ctx.asset.id))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function scopeDocuments(ctx: AssetContext, sel: SelectedNode) {
  if (sel.level === "asset") return ctx.documents;
  return ctx.documents.filter((d) => d.targetIds.includes(sel.id));
}

export function scopeParts(ctx: AssetContext, sel: SelectedNode) {
  return ctx.parts.filter((p) => sel.scopeIds.has(p.targetId));
}
