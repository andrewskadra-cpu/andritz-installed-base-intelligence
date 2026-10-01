/**
 * DEMO DATA — fictional records for the frontend prototype.
 *
 * Nothing in this file describes a real customer, plant, failure statistic,
 * part number or equipment specification. Every value is illustrative and
 * every part/document identifier is prefixed "DEMO-". The query layer in
 * `lib/installed-base.ts` is the only consumer; replace it with Supabase
 * queries and this file can be deleted.
 */

import { PI_COMPONENT_MAP } from "@/lib/pi/pi-component-map";
import { PI_FORMS } from "@/lib/pi/pi-registry";
import type {
  Asset,
  AssetEntity,
  ConditionNarrative,
  Customer,
  EngineeringReference,
  DocumentKind,
  DocumentRecord,
  EntityType,
  HealthStatus,
  PartRecord,
  Plant,
  PlantUnit,
  ServiceEvent,
  ServiceEventType,
  ViewerZone,
} from "@/types/installed-base";

/** Date the demo records were last updated. */
const RECORD_DATE = "2026-09-28";

export const customers: Customer[] = [
  {
    id: "demo-energy",
    name: "Demo Energy",
    industry: "Power generation",
    region: "Demo Region",
    accountManager: "Demo account team",
    isDemo: true,
  },
];

export const plants: Plant[] = [
  {
    id: "riverbend-station",
    customerId: "demo-energy",
    name: "Riverbend Station",
    location: "Demo location",
    plantType: "Utility boiler plant",
    commissioned: "2011",
  },
];

export const plantUnits: PlantUnit[] = [
  {
    id: "boiler-1",
    plantId: "riverbend-station",
    name: "Boiler 1",
    unitType: "Boiler",
    description: "Demo unit with retractable sootblower installed base.",
  },
];

export const assets: Asset[] = [
  {
    id: "ik700-10482",
    unitId: "boiler-1",
    model: "IK-700",
    serialNumber: "10482",
    name: "IK-700 #10482",
    equipmentType: "Long retractable sootblower",
    productLine: "Diamond Power",
    installedPosition: "Elevation A · Left wall",
    installedDate: "2016-04-12",
    operatingHours: 18420,
    recordedCycles: 41280,
  },
  {
    id: "ik700-10483",
    unitId: "boiler-1",
    model: "IK-700",
    serialNumber: "10483",
    name: "IK-700 #10483",
    equipmentType: "Long retractable sootblower",
    productLine: "Diamond Power",
    installedPosition: "Elevation A · Right wall",
    installedDate: "2016-04-12",
    operatingHours: 17960,
    recordedCycles: 40110,
  },
  {
    id: "ik700-10484",
    unitId: "boiler-1",
    model: "IK-700",
    serialNumber: "10484",
    name: "IK-700 #10484",
    equipmentType: "Long retractable sootblower",
    productLine: "Diamond Power",
    installedPosition: "Elevation B · Left wall",
    installedDate: "2018-09-30",
    operatingHours: 12740,
    recordedCycles: 28650,
  },
];

// ---------------------------------------------------------------------------
// Equipment hierarchy — each IK-700 shares the same placeholder structure.
// Nodes link by parentId only; depth is not fixed.
// ---------------------------------------------------------------------------

interface EntityTemplate {
  key: string;
  parent: string | null;
  type: EntityType;
  name: string;
  partNumber: string | null;
  zone: ViewerZone | null;
}

const entityTemplate: EntityTemplate[] = [
  { key: "carriage", parent: null, type: "assembly", name: "Carriage", partNumber: null, zone: "carriage" },
  { key: "gearbox", parent: null, type: "assembly", name: "Gearbox Assembly", partNumber: null, zone: "gearbox" },
  { key: "gear-set", parent: "gearbox", type: "component", name: "Gear Set", partNumber: "DEMO-GS-100", zone: null },
  // Components present in the IK-700 visualization model (see lib/3d/ik700-model-map.ts).
  // Names only: no part numbers, specifications or inspection records are implied.
  { key: "worm-gear", parent: "gear-set", type: "component", name: "Worm Gear", partNumber: null, zone: null },
  { key: "drive-gear", parent: "gear-set", type: "component", name: "Drive Gear", partNumber: null, zone: null },
  { key: "translation-gear", parent: "gear-set", type: "component", name: "Translation Gear", partNumber: null, zone: null },
  { key: "bevel-gear", parent: "gear-set", type: "component", name: "Bevel Gear", partNumber: null, zone: null },
  { key: "bevel-pinion", parent: "gear-set", type: "component", name: "Bevel Pinion", partNumber: null, zone: null },
  { key: "worm-shaft", parent: "gearbox", type: "component", name: "Worm Shaft", partNumber: null, zone: null },
  // Primary component-level demo issue. It carries the health engine's "bearing"
  // monitored region, so the gearbox vibration finding attaches here.
  { key: "worm-thrust-bearing-a", parent: "worm-shaft", type: "component", name: "Worm Thrust Bearing A", partNumber: null, zone: "bearing" },
  { key: "worm-thrust-bearing-b", parent: "worm-shaft", type: "component", name: "Worm Thrust Bearing B", partNumber: null, zone: null },
  { key: "lance-hub-drive-shaft", parent: "gearbox", type: "component", name: "Lance Hub Drive Shaft", partNumber: null, zone: null },
  { key: "pinion-shaft", parent: "gearbox", type: "component", name: "Pinion Shaft", partNumber: null, zone: null },
  { key: "lance-hub-bearing-front", parent: "gearbox", type: "component", name: "Lance Hub Bearing, Front", partNumber: null, zone: null },
  { key: "lance-hub-bearing-rear", parent: "gearbox", type: "component", name: "Lance Hub Bearing, Rear", partNumber: null, zone: null },
  { key: "drive-shaft-bearing-inner", parent: "gearbox", type: "component", name: "Drive Shaft Bearing, Inner", partNumber: null, zone: null },
  { key: "drive-shaft-bearing-outer", parent: "gearbox", type: "component", name: "Drive Shaft Bearing, Outer", partNumber: null, zone: null },
  { key: "pinion-shaft-bearing-left", parent: "gearbox", type: "component", name: "Pinion Shaft Bearing, Left", partNumber: null, zone: null },
  { key: "pinion-shaft-bearing-right", parent: "gearbox", type: "component", name: "Pinion Shaft Bearing, Right", partNumber: null, zone: null },
  { key: "feed-tube", parent: null, type: "assembly", name: "Feed Tube", partNumber: null, zone: "feed_tube" },
  { key: "lance-tube", parent: null, type: "assembly", name: "Lance Tube", partNumber: null, zone: "lance_tube" },
  { key: "poppet-valve", parent: null, type: "assembly", name: "Poppet Valve", partNumber: null, zone: "poppet_valve" },
  { key: "motor", parent: "carriage", type: "component", name: "Drive Motor", partNumber: null, zone: null },
];

/** Item-level engineering references, derived from the central PI component map. */
const ENGINEERING_REFERENCES: Record<string, EngineeringReference> = Object.fromEntries(
  Object.entries(PI_COMPONENT_MAP)
    .filter(([, ref]) => ref.item !== null)
    .map(([key, ref]) => [key, { document: PI_FORMS[ref.form].label, item: ref.item! }]),
);

/** Model-derived components have no inspection record in the demo data: status unknown. */
const MODEL_DERIVED = new Set([
  "worm-gear", "drive-gear", "translation-gear", "bevel-gear", "bevel-pinion", "worm-shaft",
  "lance-hub-drive-shaft", "pinion-shaft", "worm-thrust-bearing-b",
  "lance-hub-bearing-front", "lance-hub-bearing-rear", "drive-shaft-bearing-inner",
  "drive-shaft-bearing-outer", "pinion-shaft-bearing-left", "pinion-shaft-bearing-right", "motor",
]);

/** Nodes with no inspection on record for an asset. */
const uninspected: Record<string, string[]> = {
  "ik700-10482": ["poppet-valve"],
};

const entityId = (assetId: string, key: string) => `${assetId}-${key}`;

export const assetEntities: AssetEntity[] = assets.flatMap((asset) =>
  entityTemplate.map((t) => ({
    id: entityId(asset.id, t.key),
    assetId: asset.id,
    parentId: t.parent ? entityId(asset.id, t.parent) : asset.id,
    type: t.type,
    name: t.name,
    partNumber: t.partNumber,
    zone: t.zone,
    recordedStatus: (uninspected[asset.id]?.includes(t.key) || MODEL_DERIVED.has(t.key)
      ? "unknown"
      : "healthy") as HealthStatus,
    sourceReference: ENGINEERING_REFERENCES[t.key] ?? null,
  })),
);

/**
 * Component-level narratives for the primary demo issue (DEMO wording only).
 * Live values, detections and statuses still come from the health engine.
 */
export const conditionNarratives: ConditionNarrative[] = assets.map((asset) => ({
  id: `narrative-${asset.serialNumber}-worm-thrust-bearing-a`,
  assetId: asset.id,
  entityId: entityId(asset.id, "worm-thrust-bearing-a"),
  title: "Elevated gearbox vibration trend",
  observedTrend: "Gearbox vibration has increased over the simulated monitoring period",
  inference: "The pattern may indicate increased wear, loading or degradation in the worm-drive area.",
  suggestedAction:
    "Consider inspecting the worm thrust bearing and surrounding worm-drive components during an appropriate maintenance opportunity.",
}));

// ---------------------------------------------------------------------------
// Service history — the single source for last service / replacement dates
// and for running hours since service.
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

/** Asset counters at a past date, interpolated linearly from installation. */
function countersAt(asset: Asset, date: string) {
  const start = Date.parse(asset.installedDate);
  const end = Date.parse(RECORD_DATE);
  const share = Math.min(1, Math.max(0, (Date.parse(date) - start) / Math.max(end - start, DAY_MS)));
  return {
    assetOperatingHours: Math.round(asset.operatingHours * share),
    assetCycles: Math.round(asset.recordedCycles * share),
  };
}

interface ServicePlan {
  outage: string;
  lubrication: string;
  /** Sample demo inspection of Worm Thrust Bearing A. */
  wormBearingInspection: string;
}

const servicePlans: Record<string, ServicePlan> = {
  "ik700-10482": { outage: "2026-03-18", lubrication: "2024-09-24", wormBearingInspection: "2025-03-26" },
  "ik700-10483": { outage: "2026-06-02", lubrication: "2025-05-14", wormBearingInspection: "2026-06-02" },
  "ik700-10484": { outage: "2026-01-27", lubrication: "2025-06-14", wormBearingInspection: "2026-01-27" },
};

export const serviceEvents: ServiceEvent[] = assets.flatMap((asset) => {
  const plan = servicePlans[asset.id];
  const sn = asset.serialNumber;
  let seq = 0;
  const event = (key: string | null, date: string, type: ServiceEventType, description: string, performedBy: string) => {
    seq += 1;
    return {
      id: `svc-${sn}-${seq}`,
      assetId: asset.id,
      entityId: key ? entityId(asset.id, key) : asset.id,
      date,
      type,
      description,
      performedBy,
      workOrder: `DEMO-WO-${sn}-${String(seq).padStart(3, "0")}`,
      ...countersAt(asset, date),
      // No demo record contains a technician-confirmed finding.
      confirmedFinding: null,
    };
  };

  const events: ServiceEvent[] = [
    event(null, asset.installedDate, "commissioning", "Commissioning and functional test (demo record).", "Demo field service"),
    event(null, plan.outage, "inspection", "Routine outage inspection of the complete sootblower (demo record).", "Demo field service"),
    event("gearbox", plan.lubrication, "lubrication", "Gearbox oil change (demo record).", "Demo site maintenance"),
    event("gearbox", plan.outage, "inspection", "Gearbox inspection; no abnormal findings recorded (demo record).", "Demo field service"),
    event("worm-thrust-bearing-a", plan.wormBearingInspection, "inspection", "Worm thrust bearing checked for play and noise; no abnormal condition recorded (sample demo record).", "Demo field service"),
    event("carriage", plan.outage, "inspection", "Carriage wheels and track inspected (demo record).", "Demo field service"),
  ];
  if (!uninspected[asset.id]?.includes("poppet-valve")) {
    events.push(event("poppet-valve", plan.outage, "inspection", "Poppet valve seat inspected (demo record).", "Demo field service"));
  }
  return events;
});

// ---------------------------------------------------------------------------
// Documents — attached to exactly one node each.
// ---------------------------------------------------------------------------

const documentTemplate: { key: string | null; kind: DocumentKind; title: string; code: string; revision: string; updated: string }[] = [
  { key: null, kind: "drawing", title: "IK-700 General Arrangement Drawing", code: "DWG-00", revision: "C", updated: "2024-02-09" },
  { key: null, kind: "pi_sheet", title: "IK-700 Interactive PI Sheet", code: "PI-00", revision: "D", updated: "2024-02-09" },
  { key: null, kind: "procedure", title: "IK-700 Operation & Maintenance Procedure", code: "PRC-00", revision: "B", updated: "2023-06-12" },
  { key: "gearbox", kind: "drawing", title: "Gearbox Assembly Drawing", code: "DWG-10", revision: "B", updated: "2023-10-01" },
  { key: "gearbox", kind: "pi_sheet", title: "Gearbox PI Sheet", code: "PI-10", revision: "B", updated: "2023-10-01" },
  { key: "gearbox", kind: "procedure", title: "Gearbox Service Procedure", code: "PRC-10", revision: "A", updated: "2023-10-01" },
  { key: "gearbox", kind: "bom", title: "Gearbox BOM", code: "BOM-10", revision: "B", updated: "2023-10-01" },
  { key: "worm-shaft", kind: "drawing", title: "Worm Shaft & Thrust Bearing Arrangement", code: "DWG-11", revision: "A", updated: "2023-10-01" },
  { key: "worm-shaft", kind: "pi_sheet", title: "Worm Shaft PI Sheet", code: "PI-11", revision: "A", updated: "2023-10-01" },
  { key: "carriage", kind: "drawing", title: "Carriage Assembly Drawing", code: "DWG-20", revision: "A", updated: "2022-06-15" },
  { key: "carriage", kind: "pi_sheet", title: "Carriage PI Sheet", code: "PI-20", revision: "A", updated: "2022-06-15" },
  { key: "feed-tube", kind: "drawing", title: "Feed Tube Drawing", code: "DWG-30", revision: "A", updated: "2021-03-02" },
  { key: "lance-tube", kind: "drawing", title: "Lance Tube Drawing", code: "DWG-40", revision: "B", updated: "2022-11-20" },
  { key: "poppet-valve", kind: "drawing", title: "Poppet Valve Drawing", code: "DWG-50", revision: "A", updated: "2021-03-02" },
];

export const documents: DocumentRecord[] = assets.flatMap((asset) =>
  documentTemplate.map((d) => ({
    id: `doc-${asset.serialNumber}-${d.code}`,
    assetId: asset.id,
    entityId: d.key ? entityId(asset.id, d.key) : asset.id,
    kind: d.kind,
    title: d.title,
    documentNumber: `DEMO-${d.code}-${asset.serialNumber}`,
    revision: d.revision,
    updated: d.updated,
  })),
);

// ---------------------------------------------------------------------------
// Parts / BOM — each line belongs to one node's bill of materials.
// ---------------------------------------------------------------------------

interface BomLine {
  owner: string | null;
  /** Fictional demo part number; null where none is approved. */
  partNumber: string | null;
  description: string;
  quantity: number;
  link: string | null;
  ref?: EngineeringReference;
  note?: string;
}

const bomTemplate: BomLine[] = [
  // Asset BOM: major assemblies
  { owner: null, partNumber: "DEMO-ASM-CAR", description: "Carriage assembly", quantity: 1, link: "carriage" },
  { owner: null, partNumber: "DEMO-ASM-GBX", description: "Gearbox assembly", quantity: 1, link: "gearbox" },
  { owner: null, partNumber: "DEMO-ASM-FT", description: "Feed tube assembly", quantity: 1, link: "feed-tube" },
  { owner: null, partNumber: "DEMO-ASM-LT", description: "Lance tube assembly", quantity: 1, link: "lance-tube" },
  { owner: null, partNumber: "DEMO-ASM-PV", description: "Poppet valve assembly", quantity: 1, link: "poppet-valve" },
  // Gearbox BOM
  { owner: "gearbox", partNumber: "DEMO-GS-100", description: "Gear set", quantity: 1, link: "gear-set" },
  { owner: "gearbox", partNumber: "DEMO-GBX-SEAL", description: "Gearbox seal kit", quantity: 1, link: null },
  { owner: "gearbox", partNumber: "DEMO-GBX-OIL", description: "Gearbox lubricant, 1 L", quantity: 2, link: null },
  // Worm shaft: its two thrust bearings (no approved part number exists).
  { owner: "worm-shaft", partNumber: null, description: "Worm thrust bearing", quantity: 2, link: null, ref: { document: "PI 4066", item: "36" } },
  // Worm Thrust Bearing A: the component plus generic related items for planning.
  { owner: "worm-thrust-bearing-a", partNumber: null, description: "Worm thrust bearing", quantity: 1, link: null, ref: { document: "PI 4066", item: "36" } },
  { owner: "worm-thrust-bearing-a", partNumber: null, description: "Associated worm shaft seal", quantity: 1, link: null, note: "Reference to be confirmed" },
  { owner: "worm-thrust-bearing-a", partNumber: null, description: "Bearing retaining hardware", quantity: 1, link: null, note: "Reference to be confirmed" },
  // Gear set
  { owner: "gear-set", partNumber: "DEMO-GS-100", description: "Gear set", quantity: 1, link: null },
  // Carriage
  { owner: "carriage", partNumber: "DEMO-CAR-WHL", description: "Carriage wheel", quantity: 4, link: null },
  { owner: "carriage", partNumber: "DEMO-MTR-01", description: "Drive motor", quantity: 1, link: null },
  // Tubes and valve
  { owner: "feed-tube", partNumber: "DEMO-FT-PKG", description: "Feed tube packing", quantity: 1, link: null },
  { owner: "lance-tube", partNumber: "DEMO-LT-NZL", description: "Nozzle head", quantity: 1, link: null },
  { owner: "poppet-valve", partNumber: "DEMO-PV-SEAT", description: "Valve seat", quantity: 1, link: null },
  { owner: "poppet-valve", partNumber: "DEMO-PV-STEM", description: "Valve stem packing", quantity: 1, link: null },
];

export const parts: PartRecord[] = assets.flatMap((asset) => {
  const itemCounter = new Map<string | null, number>();
  return bomTemplate.map((line, index) => {
    const item = (itemCounter.get(line.owner) ?? 0) + 1;
    itemCounter.set(line.owner, item);
    return {
      id: `${asset.id}-bom-${index + 1}`,
      assetId: asset.id,
      entityId: line.owner ? entityId(asset.id, line.owner) : asset.id,
      itemNumber: item,
      partNumber: line.partNumber,
      description: line.description,
      quantity: line.quantity,
      linkedEntityId: line.link ? entityId(asset.id, line.link) : null,
      sourceReference: line.ref ?? null,
      note: line.note ?? null,
    };
  });
});
