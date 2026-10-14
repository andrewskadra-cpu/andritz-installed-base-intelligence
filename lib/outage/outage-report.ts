/**
 * Draft outage report data for export.
 *
 * A pure projection of a generated OutageScope (the same snapshot the outage
 * scope page displays): no thresholds, no extra recommendations and no second
 * planning engine. Every value below is read from the scope or from the asset
 * records it was generated from, and the whole report carries the scope's
 * single `generatedAt` timestamp.
 */

import { formatDate, formatTime } from "@/lib/format";
import { PI_FORMS } from "@/lib/pi/pi-registry";
import type { EvidenceLevel, HealthStatus } from "@/types/installed-base";
import type { OutageScope, SuggestedTiming, TraceRef } from "@/types/outage";

/** Wording approved for the report; the page's planning and prototype notices are included alongside it. */
export const REPORT_DISCLAIMER =
  "This report contains draft planning suggestions based on available demonstration condition and equipment data. It is not a confirmed diagnosis, maintenance instruction, work order, or authorization to perform work. Final decisions require qualified engineering, maintenance, and site review.";

export const PARTS_DISCLAIMER =
  "Part identification, suitability, and availability require confirmation. Lines are listed for inspection / contingency planning only; they are not replacement requirements, and no parts inquiry or order has been created.";

export const TIMING_LABEL: Record<SuggestedTiming, string> = {
  earliest_opportunity: "Earliest opportunity",
  planned_outage: "Planned outage",
};

export const EVIDENCE_LABEL: Record<EvidenceLevel, { label: string; hint: string }> = {
  observed: { label: "Observed", hint: "Raw measured value" },
  detected: { label: "Detected", hint: "Rule or baseline comparison" },
  inferred: { label: "Inferred", hint: "Hypothesis, not a diagnosis" },
  confirmed: { label: "Confirmed", hint: "Technician-verified finding" },
};

/** Per-asset facts the scope does not carry (read from the same asset records). */
export interface ReportAssetMeta {
  model: string;
  plantName: string;
  unitName: string;
}

export interface ReportEvidence {
  level: EvidenceLevel;
  statement: string;
  source: string;
  /** A "confirmed" row with no technician confirmation on record. */
  open: boolean;
}

export interface ReportConsideration {
  action: string;
  timing: string;
  basis: string;
}

export interface ReportComponentItem {
  title: string;
  status: HealthStatus;
  entityName: string;
  /** Equipment path above the component, e.g. "Gearbox Assembly › Worm Shaft". */
  path: string;
  parentName: string | null;
  technicianConfirmed: boolean;
  evidence: ReportEvidence[];
  considerations: ReportConsideration[];
  reference: string | null;
  partNumber: string | null;
}

export interface ReportAsset {
  rank: number;
  name: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  location: string;
  status: HealthStatus;
  area: { name: string; status: HealthStatus } | null;
  detections: string[];
  considerationCount: number;
  signals: { label: string; value: string; status: HealthStatus; detection: string | null }[];
  items: ReportComponentItem[];
  componentsForReview: { name: string; parentName: string; status: HealthStatus; reason: string; ids: string }[];
}

export interface ReportReference {
  label: string;
  document: string;
  title: string | null;
  item: string | null;
  usedFor: string[];
}

export interface OutageReport {
  scopeId: string;
  scopeName: string;
  customer: string;
  plant: string;
  units: string;
  window: string;
  generatedAt: string;
  generatedLabel: string;
  telemetryAsOf: string;
  liveSession: boolean;
  summary: {
    assetsReviewed: number;
    criticalAssets: number;
    attentionAssets: number;
    healthyAssets: number;
    activeIndicators: number;
    componentsForReview: number;
    inspectionConsiderations: number;
    partsToConsider: number;
  };
  headline: string;
  assets: ReportAsset[];
  inspections: { n: number; equipment: string; entityName: string; action: string; basis: string; timing: string; trace: string[] }[];
  parts: {
    partNumber: string | null;
    description: string;
    reference: string | null;
    note: string | null;
    quantity: number;
    assetName: string;
    entityName: string;
    consideration: string;
  }[];
  references: ReportReference[];
  records: { assetName: string; entityName: string; kind: string; title: string; reference: string; date: string }[];
  otherAssets: { name: string; status: HealthStatus; note: string }[];
}

const RECORD_KIND: Record<string, string> = {
  drawing: "Drawing",
  pi_sheet: "PI sheet",
  procedure: "Service procedure",
  bom: "BOM",
  service_event: "Service history",
};

const utc = (iso: string) => `${formatDate(iso)} ${formatTime(iso)} UTC`;
const traceLabels = (trace: TraceRef[]) => trace.map((t) => t.label);

/** "PI 4066 · Item 36" → document "PI 4066", item "36". */
function parseReference(label: string): { document: string; item: string | null } {
  const [document, item] = label.split(" · Item ");
  return { document: document.trim(), item: item?.trim() || null };
}

export function buildOutageReport(
  scope: OutageScope,
  meta: Record<string, ReportAssetMeta>,
  liveSession: boolean,
): OutageReport {
  const s = scope.summary;
  const top = scope.priorityAssets[0];
  const activeIndicators = scope.priorityAssets.reduce((n, a) => n + a.signals.filter((g) => g.detection).length, 0);

  const assets: ReportAsset[] = scope.priorityAssets.map((a) => {
    const m = meta[a.assetId];
    const items: ReportComponentItem[] = a.issues.map((issue) => {
      const component = a.components.find((c) => c.id === issue.entityId) ?? null;
      const inspections = a.inspections.filter((i) => i.entityId === issue.entityId);
      return {
        title: issue.title,
        status: issue.status,
        entityName: issue.entityName,
        path: inspections[0]?.areaPath ?? "",
        parentName: component?.parentName ?? null,
        technicianConfirmed: issue.technicianConfirmed,
        evidence: issue.evidence.map((ev) => ({
          level: ev.level,
          statement: ev.statement,
          source: ev.source,
          open: ev.level === "confirmed" && !issue.technicianConfirmed,
        })),
        considerations: inspections.map((i) => ({ action: i.action, timing: TIMING_LABEL[i.timing], basis: i.basis })),
        reference: component?.reference ?? null,
        partNumber: component?.partNumber ?? null,
      };
    });
    return {
      rank: a.rank,
      name: a.name,
      model: m?.model ?? "",
      serialNumber: a.serialNumber,
      equipmentType: a.equipmentType,
      location: [m?.plantName, m?.unitName, a.position].filter(Boolean).join(" · "),
      status: a.status,
      area: a.priorityArea ? { name: a.priorityArea.name, status: a.priorityArea.status } : null,
      detections: a.signals.flatMap((g) => (g.detection ? [g.detection] : [])),
      considerationCount: a.inspections.length,
      signals: a.signals.map((g) => ({ label: g.label, value: g.value, status: g.status, detection: g.detection })),
      items,
      componentsForReview: a.components.map((c) => ({
        name: c.name,
        parentName: c.parentName,
        status: c.status,
        reason: c.reason,
        ids: [c.partNumber, c.reference].filter(Boolean).join(" · ") || "No part number assigned",
      })),
    };
  });

  // Engineering references cited by the suggestions (components and parts), grouped per document item.
  const refs = new Map<string, ReportReference>();
  const cite = (label: string | null, usedFor: string) => {
    if (!label) return;
    const { document, item } = parseReference(label);
    const form = Object.values(PI_FORMS).find((f) => f.label === document) ?? null;
    const entry = refs.get(label) ?? { label, document, title: form?.title ?? null, item, usedFor: [] };
    if (!entry.usedFor.includes(usedFor)) entry.usedFor.push(usedFor);
    refs.set(label, entry);
  };
  for (const a of scope.priorityAssets) {
    for (const c of a.components) cite(c.reference, `${a.name} · ${c.name}`);
    for (const p of a.parts) cite(p.reference, `${a.name} · ${p.entityName}`);
  }

  return {
    scopeId: scope.id,
    scopeName: scope.name,
    customer: scope.customer.name,
    plant: scope.plant.name,
    units: scope.units.map((u) => u.name).join(", "),
    window: scope.outage ? `${formatDate(scope.outage.plannedStart)} – ${formatDate(scope.outage.plannedEnd)}` : "Not scheduled",
    generatedAt: scope.generatedAt,
    generatedLabel: utc(scope.generatedAt),
    telemetryAsOf: scope.telemetryAsOf ? utc(scope.telemetryAsOf) : "–",
    liveSession,
    summary: {
      assetsReviewed: s.assetsReviewed,
      criticalAssets: s.criticalAssets,
      attentionAssets: s.attentionAssets,
      healthyAssets: s.healthyAssets,
      activeIndicators,
      componentsForReview: s.componentsForReview,
      inspectionConsiderations: s.inspectionConsiderations,
      partsToConsider: s.partsToConsider,
    },
    // Same statement as the page's executive summary.
    headline: top
      ? `Based on available condition indicators, ${top.name} is the highest-priority asset${
          top.priorityArea ? `, with ${top.priorityArea.name} as the potential area of concern` : ""
        }. ${scope.priorityAssets.length} of ${s.assetsReviewed} assets show active condition indicators. No technician-confirmed mechanical failure is on record unless stated in the evidence below.`
      : "No reviewed asset shows active condition indicators. Routine outage checks only.",
    assets,
    inspections: scope.priorityAssets
      .flatMap((a) => a.inspections)
      .map((r, i) => ({
        n: i + 1,
        equipment: [r.assetName, r.areaPath].filter(Boolean).join(" · "),
        entityName: r.entityName,
        action: r.action,
        basis: r.basis,
        timing: TIMING_LABEL[r.timing],
        trace: traceLabels(r.trace),
      })),
    parts: scope.priorityAssets
      .flatMap((a) => a.parts)
      .map((p) => ({
        partNumber: p.partNumber,
        description: p.description,
        reference: p.reference,
        note: p.note,
        quantity: p.quantity,
        assetName: p.assetName,
        entityName: p.entityName,
        consideration: p.consideration,
      })),
    references: [...refs.values()],
    records: scope.priorityAssets.flatMap((a) =>
      a.records.map((r) => ({
        assetName: a.name,
        entityName: r.entityName,
        kind: RECORD_KIND[r.kind] ?? r.kind,
        title: r.title,
        reference: r.reference,
        date: formatDate(r.date),
      })),
    ),
    otherAssets: scope.otherAssets.map((a) => ({ name: a.name, status: a.status, note: a.note })),
  };
}

/** Generic words dropped from plant names in file names ("Riverbend Station" → "Riverbend"). */
const GENERIC = new Set(["station", "plant", "mill", "site", "works", "facility"]);
const fileToken = (text: string) => text.replace(/[^A-Za-z0-9]+/g, "");

/** IBIS_Draft_Outage_<Plant>_<Unit(s)>_<YYYY-MM-DD>.pdf, dated by the report snapshot. */
export function outageReportFilename(report: Pick<OutageReport, "plant" | "units" | "generatedAt">): string {
  const words = report.plant.split(/\s+/).filter(Boolean);
  const kept = words.length > 1 ? words.filter((w) => !GENERIC.has(w.toLowerCase())) : words;
  const plant = fileToken(kept.join("")) || "Plant";
  const units = report.units.split(",").map((u) => fileToken(u)).filter(Boolean).join("-") || "AllUnits";
  return `IBIS_Draft_Outage_${plant}_${units}_${report.generatedAt.slice(0, 10)}.pdf`;
}
