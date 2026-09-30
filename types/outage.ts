/**
 * Outage-scope types. An outage scope is decision support only: every item is
 * a suggestion traceable to a stored record or a health-engine output.
 */

import type {
  DocumentKind,
  EvidenceLevel,
  HealthStatus,
  ServiceEventType,
} from "./installed-base";
import type { TelemetrySignalKey } from "./telemetry";

/** Stored plan for a future outage (demo data). */
export interface PlannedOutage {
  id: string;
  plantId: string;
  unitId: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
}

/**
 * Additional inspection consideration for a node, included only when the node
 * has an active condition AND the records it references exist.
 */
export interface InspectionChecklistItem {
  id: string;
  assetId: string;
  entityId: string;
  action: string;
  /** Included only if one of these signals has a health-engine detection (empty = any condition). */
  relatedSignals: TelemetrySignalKey[];
  /** Service event type on this node that the item builds on, if any. */
  serviceEventType: ServiceEventType | null;
  /** Document kinds on this node that support the item. */
  documentKinds: DocumentKind[];
}

// ---------------------------------------------------------------------------
// Generated scope
// ---------------------------------------------------------------------------

export type TraceKind = "asset" | "entity" | "signal" | "health_rule" | "service_event" | "document" | "bom";

/** One link from a scope item back to the record it is based on. */
export interface TraceRef {
  kind: TraceKind;
  label: string;
  /** Asset page link to the related node, when one exists. */
  href: string | null;
}

export interface SupportingEvidence {
  level: EvidenceLevel;
  statement: string;
  source: string;
  trace: TraceRef[];
}

export interface ScopeIssue {
  id: string;
  entityId: string;
  entityName: string;
  title: string;
  status: HealthStatus;
  technicianConfirmed: boolean;
  /** Always observed, detected, inferred and confirmed, in that order. */
  evidence: SupportingEvidence[];
}

export type SuggestedTiming = "earliest_opportunity" | "planned_outage";

export interface OutageInspectionRecommendation {
  id: string;
  assetId: string;
  assetName: string;
  entityId: string;
  entityName: string;
  /** Equipment path above the target, e.g. "Gearbox Assembly › Worm Shaft". */
  areaPath: string;
  /** Suggestion wording ("Consider …"). Never an instruction. */
  action: string;
  timing: SuggestedTiming;
  basis: string;
  source: "health_engine" | "inspection_checklist";
  trace: TraceRef[];
}

export interface ContingencyPart {
  /** Fictional demo part number; null when no approved number exists. */
  partNumber: string | null;
  /** Engineering reference for the line (e.g. "PI 4066 · Item 36"). */
  reference: string | null;
  /** Planning note such as "Reference to be confirmed". */
  note: string | null;
  description: string;
  quantity: number;
  assetId: string;
  assetName: string;
  entityId: string;
  entityName: string;
  consideration: string;
  trace: TraceRef[];
}

export interface EngineeringRecord {
  id: string;
  kind: DocumentKind | "service_event";
  title: string;
  reference: string;
  date: string;
  entityName: string;
  href: string;
}

export interface ComponentForReview {
  id: string;
  name: string;
  partNumber: string | null;
  /** Engineering reference (e.g. "PI 4066 · Item 36"), when mapped. */
  reference: string | null;
  status: HealthStatus;
  parentName: string;
  reason: string;
  href: string;
}

export interface ScopeSignal {
  key: TelemetrySignalKey;
  label: string;
  value: string;
  status: HealthStatus;
  detection: string | null;
}

export interface OutageScopeAsset {
  assetId: string;
  name: string;
  serialNumber: string;
  equipmentType: string;
  position: string;
  href: string;
  status: HealthStatus;
  rank: number;
  priorityArea: { id: string; name: string; status: HealthStatus; href: string } | null;
  signals: ScopeSignal[];
  issues: ScopeIssue[];
  inspections: OutageInspectionRecommendation[];
  components: ComponentForReview[];
  records: EngineeringRecord[];
  parts: ContingencyPart[];
}

export interface OutageScopeSummary {
  assetsReviewed: number;
  criticalAssets: number;
  attentionAssets: number;
  healthyAssets: number;
  unknownAssets: number;
  inspectionConsiderations: number;
  componentsForReview: number;
  partsToConsider: number;
}

export interface OutageScope {
  id: string;
  name: string;
  customer: { id: string; name: string };
  plant: { id: string; name: string };
  units: { id: string; name: string }[];
  outage: PlannedOutage | null;
  generatedAt: string;
  /** Latest telemetry timestamp across included assets. */
  telemetryAsOf: string | null;
  summary: OutageScopeSummary;
  /** Assets with active condition indicators, most severe first. */
  priorityAssets: OutageScopeAsset[];
  /** Assets reviewed with no active indicators. */
  otherAssets: { assetId: string; name: string; status: HealthStatus; href: string; note: string }[];
}
