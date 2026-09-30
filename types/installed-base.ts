/**
 * Installed-base domain types.
 *
 * Records reference their parent by id (customerId, plantId, ...) so they map
 * directly onto relational tables when the demo dataset is replaced by Supabase.
 */

export type HealthStatus = "healthy" | "attention" | "critical" | "unknown";

/**
 * How much certainty backs a statement about equipment condition.
 * An INFERRED statement must never be presented as CONFIRMED.
 */
export type EvidenceLevel = "observed" | "detected" | "inferred" | "confirmed";

/** Levels of the equipment hierarchy that can be selected on the asset page. */
export type HierarchyLevel = "asset" | "assembly" | "component";

/** Regions of the placeholder equipment visualization that can be highlighted. */
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

/** Operating counters shared by assets, assemblies and components. */
export interface OperatingRecord {
  status: HealthStatus;
  operatingHours: number | null;
  cycles: number | null;
  lastService: string | null;
  lastReplacement: string | null;
}

export interface Asset extends OperatingRecord {
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
}

export interface Assembly extends OperatingRecord {
  id: string;
  assetId: string;
  name: string;
  viewerZone: ViewerZone;
}

export interface Component extends OperatingRecord {
  id: string;
  assemblyId: string;
  name: string;
  partNumber: string;
  viewerZone: ViewerZone;
}

export interface ConditionEvidence {
  level: EvidenceLevel;
  statement: string;
  source: string;
  recordedAt: string | null;
}

/** An open condition on some node of the hierarchy, with its evidence chain. */
export interface ActiveCondition {
  id: string;
  assetId: string;
  targetLevel: HierarchyLevel;
  targetId: string;
  title: string;
  status: HealthStatus;
  technicianConfirmed: boolean;
  evidence: ConditionEvidence[];
}

export interface InspectionRecommendation {
  id: string;
  assetId: string;
  targetId: string;
  priority: "routine" | "planned" | "prompt";
  action: string;
  rationale: string;
}

export type SensorChannelKey =
  | "vibration"
  | "gearbox_temperature"
  | "motor_current"
  | "travel_time";

export interface SensorChannel {
  id: string;
  assetId: string;
  key: SensorChannelKey;
  label: string;
  unit: string;
  /** Demo baseline used for "detected" comparisons. Not an engineering limit. */
  baseline: number;
  /** Hierarchy nodes this channel is relevant to. */
  targetIds: string[];
}

export interface SensorReading {
  channelId: string;
  timestamp: string;
  value: number;
}

export interface ServiceEvent {
  id: string;
  assetId: string;
  targetId: string;
  date: string;
  type: "inspection" | "repair" | "replacement" | "lubrication" | "commissioning";
  summary: string;
  performedBy: string;
  workOrder: string;
}

export interface DocumentRecord {
  id: string;
  assetId: string;
  targetIds: string[];
  kind: "drawing" | "pi_sheet";
  title: string;
  documentNumber: string;
  revision: string;
  updated: string;
}

export interface PartRecord {
  id: string;
  assetId: string;
  targetId: string;
  partNumber: string;
  description: string;
  quantity: number;
  /** Item number as it appears on the related PI sheet. */
  itemNumber: number;
}

/** Everything the asset intelligence page needs, resolved in one query. */
export interface AssetContext {
  customer: Customer;
  plant: Plant;
  unit: PlantUnit;
  asset: Asset;
  assemblies: Assembly[];
  components: Component[];
  conditions: ActiveCondition[];
  recommendations: InspectionRecommendation[];
  sensorChannels: SensorChannel[];
  sensorReadings: SensorReading[];
  serviceEvents: ServiceEvent[];
  documents: DocumentRecord[];
  parts: PartRecord[];
}

export type SearchResultKind =
  | "customer"
  | "plant"
  | "unit"
  | "asset"
  | "assembly"
  | "component";

export interface SearchEntry {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  href: string;
  status: HealthStatus | null;
  keywords: string;
}
