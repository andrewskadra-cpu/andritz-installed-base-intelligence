/**
 * Installed-base domain types.
 *
 * Stored records reference their parent by id so they map directly onto
 * relational tables when the demo dataset is replaced by Supabase. Health
 * status, last-service dates and running hours are NOT stored on equipment
 * records — they are derived (see lib/asset-model.ts) from service events and
 * telemetry, so there is one source of truth for each fact.
 */

import type { TelemetrySignalKey } from "./telemetry";

export type HealthStatus ="healthy" | "attention" | "critical" | "unknown";

/**
 * How much certainty backs a statement about equipment condition.
 * An INFERRED statement must never be presented as CONFIRMED.
 */
export type EvidenceLevel = "observed" | "detected" | "inferred" | "confirmed";

/**
 * Physical region of an asset. Keys the equipment viewer geometry and the
 * health engine's monitored regions.
 */
export type ViewerZone =
  | "carriage"
  | "gearbox"
  | "bearing"
  | "feed_tube"
  | "lance_tube"
  | "poppet_valve";

export interface Customer {
  id: string;
  name: string;
  industry: string;
  region: string;
  accountManager: string;
  isDemo: boolean;
}

export interface Plant {
  id: string;
  customerId: string;
  name: string;
  location: string;
  plantType: string;
  commissioned: string;
}

export interface PlantUnit {
  id: string;
  plantId: string;
  name: string;
  unitType: string;
  description: string;
}

export interface Asset {
  id: string;
  unitId: string;
  /** Equipment model, e.g. "IK-700". */
  model: string;
  serialNumber: string;
  name: string;
  equipmentType: string;
  productLine: string;
  installedPosition: string;
  installedDate: string;
  /** Operating hours as of the latest record. */
  operatingHours: number;
  /** Cycle count as of the latest record; live telemetry continues from here. */
  recordedCycles: number;
}

export type EntityType = "assembly" | "component";

/**
 * Any sub-asset equipment node. Nodes form a tree of arbitrary depth through
 * `parentId`, which is either the asset id (top level) or another entity id.
 */
export interface AssetEntity {
  id: string;
  assetId: string;
  parentId: string;
  type: EntityType;
  name: string;
  /** Fictional demo part identifier, when the node is a purchasable part. */
  partNumber: string | null;
  /** Physical region in the viewer / health engine, if the node has one. */
  zone: ViewerZone | null;
  /**
   * Status from the latest inspection record. Live telemetry overrides this
   * for monitored regions. "unknown" means no recent inspection on record.
   */
  recordedStatus: HealthStatus;
  /** Engineering document reference for this component, when mapped. */
  sourceReference: EngineeringReference | null;
}

/** Pointer into an engineering document (e.g. a PI form item). */
export interface EngineeringReference {
  document: string;
  item: string;
}

/**
 * DEMO narrative for a component-level condition. Supplies component-specific
 * wording; live values, detections and statuses still come from the health
 * engine, and nothing here can mark a condition confirmed.
 */
export interface ConditionNarrative {
  id: string;
  assetId: string;
  entityId: string;
  title: string;
  /** Used only when the triggering signal actually rose over the telemetry window. */
  observedTrend: string;
  inference: string;
  suggestedAction: string;
}

export type ServiceEventType = "inspection" | "repair" | "replacement" | "lubrication" | "commissioning";

export interface ServiceEvent {
  id: string;
  assetId: string;
  /** Asset id or entity id the work was performed on. */
  entityId: string;
  date: string;
  type: ServiceEventType;
  description: string;
  performedBy: string;
  workOrder: string;
  /** Asset operating hours / cycles when the event took place. */
  assetOperatingHours: number;
  assetCycles: number;
  /**
   * Finding explicitly verified by a technician or engineer during this event.
   * The only source that may mark a condition as CONFIRMED.
   */
  confirmedFinding: string | null;
}

export type DocumentKind = "drawing" | "pi_sheet" | "procedure" | "bom";

export interface DocumentRecord {
  id: string;
  assetId: string;
  /** Asset id or entity id the document describes. */
  entityId: string;
  kind: DocumentKind;
  title: string;
  documentNumber: string;
  revision: string;
  updated: string;
}

/** One line of a node's bill of materials. */
export interface PartRecord {
  id: string;
  assetId: string;
  /** Asset id or entity id whose BOM this line belongs to. */
  entityId: string;
  /** Item number as it appears on the related PI sheet. */
  itemNumber: number;
  /** Fictional demo part number; null when no approved number exists. */
  partNumber: string | null;
  /** Engineering reference for the line, when mapped. */
  sourceReference: EngineeringReference | null;
  /** Planning note, e.g. "Reference to be confirmed". */
  note: string | null;
  description: string;
  quantity: number;
  /** When the line is itself a node in the hierarchy (e.g. an assembly). */
  linkedEntityId: string | null;
}

/** One reading of one signal, as plotted. */
export interface SensorReading {
  signal: string;
  timestamp: string;
  value: number;
}

/** An open condition on some node, with its evidence chain. */
export interface ActiveCondition {
  id: string;
  assetId: string;
  entityId: string;
  title: string;
  status: HealthStatus;
  technicianConfirmed: boolean;
  /** Service event holding the technician-confirmed finding, when one exists. */
  confirmedByEventId: string | null;
  evidence: ConditionEvidence[];
  /** Telemetry signals that raised the condition. */
  signals: TelemetrySignalKey[];
  /** Health-engine detection statements behind the condition. */
  reasons: string[];
}

export interface ConditionEvidence {
  level: EvidenceLevel;
  statement: string;
  source: string;
  recordedAt: string | null;
}

export interface InspectionRecommendation {
  id: string;
  assetId: string;
  entityId: string;
  priority: "routine" | "planned" | "prompt";
  action: string;
  rationale: string;
}

/** Stored records for one asset, resolved in one query. */
export interface AssetRecords {
  customer: Customer;
  plant: Plant;
  unit: PlantUnit;
  asset: Asset;
  entities: AssetEntity[];
  serviceEvents: ServiceEvent[];
  documents: DocumentRecord[];
  parts: PartRecord[];
  conditionNarratives: ConditionNarrative[];
}

export type SearchResultKind = "customer" | "plant" | "unit" | "asset" | "assembly" | "component";

export interface SearchEntry {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  href: string;
  status: HealthStatus | null;
  keywords: string;
}
