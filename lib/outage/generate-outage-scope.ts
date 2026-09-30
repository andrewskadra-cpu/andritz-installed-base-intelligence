/**
 * Converts current installed-base health into outage-planning suggestions.
 *
 * Pure and presentation-free. It consumes the derived asset models (stored
 * records + health-engine output), the planned outage and the inspection
 * checklist. It contains NO threshold logic: statuses, detections and findings
 * come from the health engine via buildAssetModel. Every suggestion carries
 * trace references to the records it is based on; anything without a trace is
 * dropped.
 */

import {
  nodeMetrics,
  pathTo,
  priorityArea,
  sortBySeverity,
  subtreeIds,
  type AssetModel,
  type HierarchyNode,
} from "@/lib/asset-model";
import { formatDate } from "@/lib/format";
import { SIGNAL_ORDER, TELEMETRY_SIGNALS, formatSignal } from "@/lib/telemetry/signals";
import type {
  ActiveCondition,
  Customer,
  EngineeringReference,
  HealthStatus,
  Plant,
  PlantUnit,
} from "@/types/installed-base";
import type {
  ComponentForReview,
  ContingencyPart,
  EngineeringRecord,
  InspectionChecklistItem,
  OutageInspectionRecommendation,
  OutageScope,
  OutageScopeAsset,
  PlannedOutage,
  ScopeIssue,
  ScopeSignal,
  SupportingEvidence,
  TraceRef,
} from "@/types/outage";
import type { TelemetrySignalKey } from "@/types/telemetry";

export interface OutageScopeInput {
  customer: Customer;
  plant: Plant;
  units: PlantUnit[];
  outage: PlannedOutage | null;
  models: AssetModel[];
  checklist: InspectionChecklistItem[];
  generatedAt: string;
}

const RANK: Record<HealthStatus, number> = { critical: 0, attention: 1, unknown: 2, healthy: 3 };

function hrefFor(model: AssetModel, id: string) {
  const assetId = model.rootId;
  return id === assetId ? `/assets/${assetId}` : `/assets/${assetId}?entity=${encodeURIComponent(id)}`;
}

// ---------------------------------------------------------------------------
// Trace helpers
// ---------------------------------------------------------------------------

const entityTrace = (model: AssetModel, node: HierarchyNode): TraceRef => ({
  kind: node.type === "asset" ? "asset" : "entity",
  label: node.type === "asset" ? node.name : `${model.records.asset.name} › ${node.name}`,
  href: hrefFor(model, node.id),
});

function signalTrace(model: AssetModel, key: TelemetrySignalKey): TraceRef {
  const value = model.assessment?.signals[key].latest;
  return {
    kind: "signal",
    label: `${TELEMETRY_SIGNALS[key].label}${value !== undefined ? ` = ${formatSignal(key, value)}` : ""}`,
    href: hrefFor(model, model.rootId),
  };
}

const ruleTrace = (reason: string): TraceRef => ({ kind: "health_rule", label: reason, href: null });

/** Names between the asset and the node, e.g. "Gearbox Assembly › Worm Shaft". */
const areaPath = (model: AssetModel, id: string) =>
  pathTo(model, id)
    .slice(1, -1)
    .map((n) => n.name)
    .join(" › ");

const refLabel = (ref: EngineeringReference | null) => (ref ? `${ref.document} · Item ${ref.item}` : null);

/** Engineering reference of a node as a trace chip (e.g. "PI 4066 · Item 36"). */
function referenceTrace(model: AssetModel, node: HierarchyNode): TraceRef[] {
  const label = refLabel(node.sourceReference);
  return label ? [{ kind: "document", label: `${label} · engineering reference`, href: hrefFor(model, node.id) }] : [];
}

// ---------------------------------------------------------------------------
// Per-asset sections
// ---------------------------------------------------------------------------

function buildSignals(model: AssetModel): ScopeSignal[] {
  const a = model.assessment;
  if (!a) return [];
  return SIGNAL_ORDER.map((key) => ({
    key,
    label: TELEMETRY_SIGNALS[key].label,
    value: formatSignal(key, a.signals[key].latest),
    status: a.signals[key].status,
    detection: a.signals[key].detection,
  }));
}

function buildIssue(model: AssetModel, c: ActiveCondition): ScopeIssue {
  const node = model.nodes[c.entityId];
  const serviceCount = nodeMetrics(model, c.entityId).events.length;
  const confirmedEvent = c.confirmedByEventId
    ? model.records.serviceEvents.find((e) => e.id === c.confirmedByEventId)
    : undefined;

  const traceFor = (level: SupportingEvidence["level"]): TraceRef[] => {
    switch (level) {
      case "observed":
        return c.signals.map((k) => signalTrace(model, k));
      case "detected":
        return c.reasons.map(ruleTrace);
      case "inferred":
        return [entityTrace(model, node)];
      case "confirmed":
        return confirmedEvent
          ? [{ kind: "service_event", label: `${confirmedEvent.workOrder} · ${formatDate(confirmedEvent.date)}`, href: hrefFor(model, c.entityId) }]
          : [
              {
                kind: "service_event",
                label: `${serviceCount} service record${serviceCount === 1 ? "" : "s"} reviewed for ${node.name}; none confirm a finding`,
                href: hrefFor(model, c.entityId),
              },
            ];
    }
  };

  return {
    id: c.id,
    entityId: c.entityId,
    entityName: node.name,
    title: c.title,
    status: c.status,
    technicianConfirmed: c.technicianConfirmed,
    evidence: c.evidence.map((ev) => ({ ...ev, trace: traceFor(ev.level) })),
  };
}

function conditionsIn(model: AssetModel, entityId: string) {
  const scope = subtreeIds(model, entityId);
  return model.conditions.filter((c) => scope.has(c.entityId));
}

function buildInspections(model: AssetModel, checklist: InspectionChecklistItem[]): OutageInspectionRecommendation[] {
  const { asset, documents, serviceEvents } = model.records;
  const result: OutageInspectionRecommendation[] = [];

  // 1. Suggestions raised by the health engine for each active condition.
  for (const rec of model.recommendations) {
    const node = model.nodes[rec.entityId];
    const condition = model.conditions.find((c) => c.entityId === rec.entityId);
    const procedure = documents.find((d) => d.entityId === rec.entityId && d.kind === "procedure");
    result.push({
      id: `insp-${rec.id}`,
      assetId: asset.id,
      assetName: asset.name,
      entityId: rec.entityId,
      entityName: node.name,
      areaPath: areaPath(model, rec.entityId),
      action: rec.action,
      timing: rec.priority === "prompt" ? "earliest_opportunity" : "planned_outage",
      basis: rec.rationale,
      source: "health_engine",
      trace: [
        entityTrace(model, node),
        ...(condition?.signals ?? []).map((k) => signalTrace(model, k)),
        ...(condition?.reasons ?? []).map(ruleTrace),
        ...(procedure ? [{ kind: "document" as const, label: `${procedure.documentNumber} · ${procedure.title}`, href: hrefFor(model, rec.entityId) }] : []),
        ...referenceTrace(model, node),
      ],
    });
  }

  // 2. Checklist items, only where the node is affected and the referenced records exist.
  for (const item of checklist.filter((i) => i.assetId === asset.id)) {
    const node = model.nodes[item.entityId];
    if (!node) continue;
    const affected = conditionsIn(model, item.entityId);
    if (affected.length === 0) continue;

    const detectedSignals = item.relatedSignals.filter((k) => model.assessment?.signals[k].detection);
    if (item.relatedSignals.length > 0 && detectedSignals.length === 0) continue;

    const event = item.serviceEventType
      ? serviceEvents
          .filter((e) => e.entityId === item.entityId && e.type === item.serviceEventType)
          .sort((a, b) => b.date.localeCompare(a.date))[0]
      : undefined;
    if (item.serviceEventType && !event) continue;

    const docs = documents.filter((d) => d.entityId === item.entityId && item.documentKinds.includes(d.kind));
    if (item.documentKinds.length > 0 && docs.length === 0) continue;

    const worst = sortBySeverity(affected)[0].status;
    const detections = detectedSignals.map((k) => model.assessment!.signals[k].detection!);
    result.push({
      id: `insp-${item.id}`,
      assetId: asset.id,
      assetName: asset.name,
      entityId: item.entityId,
      entityName: node.name,
      areaPath: areaPath(model, item.entityId),
      action: item.action,
      timing: worst === "critical" ? "earliest_opportunity" : "planned_outage",
      basis: [
        detections.length ? `Condition indicators: ${detections.join("; ").toLowerCase()}.` : null,
        event ? `Last recorded ${event.type}: ${formatDate(event.date)} (${event.workOrder}).` : null,
      ]
        .filter(Boolean)
        .join(" "),
      source: "inspection_checklist",
      trace: [
        entityTrace(model, node),
        ...detectedSignals.map((k) => signalTrace(model, k)),
        ...detections.map(ruleTrace),
        ...(event ? [{ kind: "service_event" as const, label: `${event.workOrder} · ${formatDate(event.date)}`, href: hrefFor(model, item.entityId) }] : []),
        ...docs.map((d) => ({ kind: "document" as const, label: `${d.documentNumber} · ${d.title}`, href: hrefFor(model, item.entityId) })),
      ],
    });
  }

  // Traceability guard: never emit a suggestion without a supporting record.
  return result
    .filter((r) => r.trace.some((t) => t.kind !== "asset" && t.kind !== "entity"))
    .sort((a, b) => (a.timing === b.timing ? 0 : a.timing === "earliest_opportunity" ? -1 : 1));
}

/** Nodes with conditions plus their ancestors (excluding the asset itself). */
function affectedNodes(model: AssetModel): HierarchyNode[] {
  const ids = new Set<string>();
  for (const c of model.conditions) {
    for (const n of pathTo(model, c.entityId)) if (n.type !== "asset") ids.add(n.id);
  }
  return [...ids].map((id) => model.nodes[id]).sort((a, b) => a.depth - b.depth);
}

function buildComponents(model: AssetModel): ComponentForReview[] {
  return Object.values(model.nodes)
    // A component's OWN status or conditions qualify it; a critical child alone does not.
    .filter(
      (n) =>
        n.type === "component" &&
        (n.ownStatus === "critical" || n.ownStatus === "attention" || model.conditions.some((c) => c.entityId === n.id)),
    )
    .map((n) => {
      const condition = model.conditions.find((c) => c.entityId === n.id);
      const parent = n.parentId ? model.nodes[n.parentId] : null;
      return {
        id: n.id,
        name: n.name,
        partNumber: n.partNumber,
        reference: refLabel(n.sourceReference),
        status: n.status,
        parentName: parent?.name ?? "",
        reason: condition ? `${condition.title} (${condition.reasons.join("; ").toLowerCase()})` : `Status ${n.status} within ${parent?.name}`,
        href: hrefFor(model, n.id),
      };
    });
}

function buildRecords(model: AssetModel, nodes: HierarchyNode[]): EngineeringRecord[] {
  const ids = new Set(nodes.map((n) => n.id));
  const docs: EngineeringRecord[] = model.records.documents
    .filter((d) => ids.has(d.entityId))
    .map((d) => ({
      id: d.id,
      kind: d.kind,
      title: d.title,
      reference: `${d.documentNumber} · Rev ${d.revision}`,
      date: d.updated,
      entityName: model.nodes[d.entityId].name,
      href: hrefFor(model, d.entityId),
    }));
  const events: EngineeringRecord[] = model.records.serviceEvents
    .filter((e) => ids.has(e.entityId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({
      id: e.id,
      kind: "service_event" as const,
      title: e.description,
      reference: e.workOrder,
      date: e.date,
      entityName: model.nodes[e.entityId].name,
      href: hrefFor(model, e.entityId),
    }));
  return [...docs, ...events];
}

function buildParts(model: AssetModel, nodes: HierarchyNode[]): ContingencyPart[] {
  const { asset, parts, documents } = model.records;
  const seen = new Map<string, ContingencyPart>();
  for (const node of [...nodes].sort((a, b) => b.depth - a.depth)) {
    const conditions = conditionsIn(model, node.id);
    if (conditions.length === 0) continue;
    const bomDoc = documents.find((d) => d.entityId === node.id && d.kind === "bom");
    for (const line of parts.filter((p) => p.entityId === node.id)) {
      const linked = line.linkedEntityId ? model.nodes[line.linkedEntityId] : null;
      // Skip sub-assemblies and linked nodes with no indicators of their own.
      if (linked && (linked.type === "assembly" || conditionsIn(model, linked.id).length === 0)) continue;
      // Lines without an approved part number de-duplicate by description.
      const key = line.partNumber ?? line.description.toLowerCase();
      if (seen.has(key)) continue;
      seen.set(key, {
        partNumber: line.partNumber,
        reference: refLabel(line.sourceReference),
        note: line.note,
        description: line.description,
        quantity: line.quantity,
        assetId: asset.id,
        assetName: asset.name,
        entityId: node.id,
        entityName: node.name,
        consideration: `Consider having available for inspection / contingency during the ${node.name} inspection.`,
        trace: [
          {
            kind: "bom",
            label: bomDoc ? `${bomDoc.documentNumber} · item ${line.itemNumber}` : `${node.name} BOM · item ${line.itemNumber}`,
            href: hrefFor(model, node.id),
          },
          ...conditions.map((c) => ruleTrace(`${c.title} · ${model.nodes[c.entityId].name}`)),
          ...(line.sourceReference
            ? [{ kind: "document" as const, label: `${refLabel(line.sourceReference)} · engineering reference`, href: hrefFor(model, node.id) }]
            : []),
        ],
      });
    }
  }
  return [...seen.values()];
}

function buildScopeAsset(model: AssetModel, checklist: InspectionChecklistItem[]): OutageScopeAsset {
  const { asset } = model.records;
  const area = priorityArea(model);
  const nodes = affectedNodes(model);
  return {
    assetId: asset.id,
    name: asset.name,
    serialNumber: asset.serialNumber,
    equipmentType: asset.equipmentType,
    position: asset.installedPosition,
    href: hrefFor(model, asset.id),
    status: model.nodes[model.rootId].status,
    rank: 0,
    priorityArea: area ? { id: area.id, name: area.name, status: area.status, href: hrefFor(model, area.id) } : null,
    signals: buildSignals(model),
    issues: sortBySeverity(model.conditions).map((c) => buildIssue(model, c)),
    inspections: buildInspections(model, checklist),
    components: buildComponents(model),
    records: buildRecords(model, nodes),
    parts: buildParts(model, nodes),
  };
}

// ---------------------------------------------------------------------------

export function generateOutageScope(input: OutageScopeInput): OutageScope {
  const { customer, plant, units, outage, models, checklist, generatedAt } = input;

  const withIndicators = models.filter((m) => m.conditions.length > 0);
  const priorityAssets = withIndicators
    .map((m) => buildScopeAsset(m, checklist))
    .sort((a, b) => RANK[a.status] - RANK[b.status] || b.issues.length - a.issues.length)
    .map((a, i) => ({ ...a, rank: i + 1 }));

  const otherAssets = models
    .filter((m) => m.conditions.length === 0)
    .map((m) => ({
      assetId: m.rootId,
      name: m.records.asset.name,
      status: m.nodes[m.rootId].status,
      href: hrefFor(m, m.rootId),
      note: "No active condition indicators in the available demo data. Routine outage checks only.",
    }));

  const statuses = models.map((m) => m.nodes[m.rootId].status);
  const count = (s: HealthStatus) => statuses.filter((x) => x === s).length;
  const latest = models
    .map((m) => m.assessment?.latest.timestamp)
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1);

  return {
    id: `scope-${plant.id}-${units.map((u) => u.id).join("+")}-${generatedAt}`,
    name: outage?.name ?? `${units.map((u) => u.name).join(", ")} outage scope (demo)`,
    customer: { id: customer.id, name: customer.name },
    plant: { id: plant.id, name: plant.name },
    units: units.map((u) => ({ id: u.id, name: u.name })),
    outage,
    generatedAt,
    telemetryAsOf: latest ?? null,
    summary: {
      assetsReviewed: models.length,
      criticalAssets: count("critical"),
      attentionAssets: count("attention"),
      healthyAssets: count("healthy"),
      unknownAssets: count("unknown"),
      inspectionConsiderations: priorityAssets.reduce((n, a) => n + a.inspections.length, 0),
      componentsForReview: priorityAssets.reduce((n, a) => n + a.components.length, 0),
      partsToConsider: priorityAssets.reduce((n, a) => n + a.parts.length, 0),
    },
    priorityAssets,
    otherAssets,
  };
}
