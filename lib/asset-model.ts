/**
 * Builds the single derived model of an asset that every screen reads:
 *
 *   stored records + telemetry assessment → hierarchy with rolled-up health,
 *   active conditions, recommendations and per-node metrics.
 *
 * Pure and deterministic, so the server (plant/customer summaries, first
 * render) and the client (live updates) always agree.
 */

import { worstStatus } from "@/lib/telemetry/health-engine";
import type {
  ActiveCondition,
  AssetRecords,
  EntityType,
  HealthStatus,
  InspectionRecommendation,
  ServiceEvent,
  ViewerZone,
} from "@/types/installed-base";
import type { HealthAssessment } from "@/types/telemetry";

export type NodeType = "asset" | EntityType;

export interface HierarchyNode {
  id: string;
  type: NodeType;
  name: string;
  parentId: string | null;
  childIds: string[];
  depth: number;
  partNumber: string | null;
  zone: ViewerZone | null;
  /** Status observed directly on this node (telemetry or inspection record). */
  ownStatus: HealthStatus;
  /** Own status rolled up with all descendants. This is the status shown in the UI. */
  status: HealthStatus;
}

export interface AssetModel {
  records: AssetRecords;
  assessment: HealthAssessment | null;
  rootId: string;
  nodes: Record<string, HierarchyNode>;
  conditions: ActiveCondition[];
  recommendations: InspectionRecommendation[];
  /** Live cycle count, falling back to the recorded value. */
  currentCycles: number;
}

/** Unknown only when nothing is known; otherwise the worst known status. */
function rollUp(statuses: HealthStatus[]): HealthStatus {
  const known = statuses.filter((s) => s !== "unknown");
  return known.length === 0 ? "unknown" : worstStatus(known);
}

export function buildAssetModel(records: AssetRecords, assessment: HealthAssessment | null): AssetModel {
  const { asset, entities } = records;
  const nodes: Record<string, HierarchyNode> = {};

  nodes[asset.id] = {
    id: asset.id,
    type: "asset",
    name: asset.name,
    parentId: null,
    childIds: [],
    depth: 0,
    partNumber: null,
    zone: null,
    ownStatus: assessment?.status ?? "unknown",
    status: "unknown",
  };
  for (const e of entities) {
    const live = e.zone ? assessment?.zones[e.zone] : undefined;
    nodes[e.id] = {
      id: e.id,
      type: e.type,
      name: e.name,
      parentId: e.parentId,
      childIds: [],
      depth: 0,
      partNumber: e.partNumber,
      zone: e.zone,
      ownStatus: live ?? e.recordedStatus,
      status: "unknown",
    };
  }
  for (const e of entities) nodes[e.parentId]?.childIds.push(e.id);

  const resolve = (id: string, depth: number): HealthStatus => {
    const node = nodes[id];
    node.depth = depth;
    node.status = rollUp([node.ownStatus, ...node.childIds.map((c) => resolve(c, depth + 1))]);
    return node.status;
  };
  resolve(asset.id, 0);

  const nodeForZone = (zone: ViewerZone) => entities.find((e) => e.zone === zone)?.id ?? asset.id;
  const conditions: ActiveCondition[] = [];
  const recommendations: InspectionRecommendation[] = [];
  for (const finding of assessment?.findings ?? []) {
    const id = nodeForZone(finding.zone);
    // Only a technician-confirmed service record may populate CONFIRMED.
    const scope = subtreeIdsOf(nodes, id);
    const confirmedBy = records.serviceEvents
      .filter((e) => e.confirmedFinding && scope.has(e.entityId))
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const evidence = confirmedBy
      ? finding.evidence.map((ev) =>
          ev.level === "confirmed"
            ? {
                level: ev.level,
                statement: `Recorded technician finding: ${confirmedBy.confirmedFinding}`,
                source: `Service record ${confirmedBy.workOrder}`,
                recordedAt: confirmedBy.date,
              }
            : ev,
        )
      : finding.evidence;
    conditions.push({
      id: `live-${finding.zone}`,
      assetId: asset.id,
      entityId: id,
      title: finding.title,
      status: finding.status,
      technicianConfirmed: Boolean(confirmedBy),
      confirmedByEventId: confirmedBy?.id ?? null,
      evidence,
      signals: finding.signals,
      reasons: finding.reasons,
    });
    recommendations.push({ id: `live-rec-${finding.zone}`, assetId: asset.id, entityId: id, ...finding.recommendation });
  }

  return {
    records,
    assessment,
    rootId: asset.id,
    nodes,
    conditions,
    recommendations,
    currentCycles: assessment?.latest.cycleCount ?? asset.recordedCycles,
  };
}

// ---------------------------------------------------------------------------
// Tree helpers — generic over depth.
// ---------------------------------------------------------------------------

/** Nodes from the asset root down to `id`, inclusive. */
export function pathTo(model: AssetModel, id: string): HierarchyNode[] {
  const path: HierarchyNode[] = [];
  let node: HierarchyNode | undefined = model.nodes[id];
  while (node) {
    path.unshift(node);
    node = node.parentId ? model.nodes[node.parentId] : undefined;
  }
  return path;
}

function subtreeIdsOf(nodes: Record<string, HierarchyNode>, id: string): Set<string> {
  const ids = new Set<string>();
  const walk = (nodeId: string) => {
    ids.add(nodeId);
    nodes[nodeId]?.childIds.forEach(walk);
  };
  walk(id);
  return ids;
}

/** `id` and every descendant id. */
export function subtreeIds(model: AssetModel, id: string): Set<string> {
  return subtreeIdsOf(model.nodes, id);
}

const SEVERITY_RANK: Record<HealthStatus, number> = { critical: 0, attention: 1, unknown: 2, healthy: 3 };
const PRIORITY_RANK: Record<InspectionRecommendation["priority"], number> = { prompt: 0, planned: 1, routine: 2 };

export function sortBySeverity<T extends { status: HealthStatus }>(items: T[]): T[] {
  return [...items].sort((a, b) => SEVERITY_RANK[a.status] - SEVERITY_RANK[b.status]);
}

export function sortByPriority(items: InspectionRecommendation[]) {
  return [...items].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

/** Direct child of the asset that needs attention most, if any. */
export function priorityArea(model: AssetModel): HierarchyNode | null {
  const zone = model.assessment?.summary.priorityZone;
  const top = model.nodes[model.rootId].childIds.map((id) => model.nodes[id]);
  const byZone = zone ? top.find((n) => n.zone === zone) : undefined;
  if (byZone) return byZone;
  const worst = sortBySeverity(top.filter((n) => n.status === "critical" || n.status === "attention"))[0];
  return worst ?? null;
}

// ---------------------------------------------------------------------------
// Per-node metrics derived from service history.
// ---------------------------------------------------------------------------

export interface NodeMetrics {
  /** Hours since installation, or since the node's last replacement. */
  operatingHours: number;
  cycles: number;
  lastService: ServiceEvent | null;
  lastInspection: ServiceEvent | null;
  lastReplacement: ServiceEvent | null;
  hoursSinceService: number | null;
  /** Service events on this node and its descendants, newest first. */
  events: ServiceEvent[];
}

export function nodeMetrics(model: AssetModel, id: string): NodeMetrics {
  const { asset, serviceEvents } = model.records;
  const scope = subtreeIds(model, id);
  const events = serviceEvents.filter((e) => scope.has(e.entityId)).sort((a, b) => b.date.localeCompare(a.date));
  const lastService = events.find((e) => e.type !== "commissioning") ?? null;
  const lastInspection = events.find((e) => e.type === "inspection") ?? null;
  const lastReplacement = events.find((e) => e.type === "replacement") ?? null;
  const ownReplacement = events.find((e) => e.type === "replacement" && e.entityId === id);

  return {
    operatingHours: asset.operatingHours - (ownReplacement?.assetOperatingHours ?? 0),
    cycles: model.currentCycles - (ownReplacement?.assetCycles ?? 0),
    lastService,
    lastInspection,
    lastReplacement,
    hoursSinceService: lastService ? asset.operatingHours - lastService.assetOperatingHours : null,
    events,
  };
}
