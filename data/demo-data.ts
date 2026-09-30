/**
 * DEMO DATA — fictional records for the frontend prototype.
 *
 * Nothing in this file describes a real customer, plant, failure statistic or
 * equipment specification. Every value is illustrative. The query layer in
 * `lib/installed-base.ts` is the only consumer; replace it with Supabase
 * queries and this file can be deleted.
 */

import type {
  ActiveCondition,
  Assembly,
  Asset,
  Component,
  Customer,
  DocumentRecord,
  HealthStatus,
  InspectionRecommendation,
  PartRecord,
  Plant,
  PlantUnit,
  SensorChannel,
  SensorChannelKey,
  SensorReading,
  ServiceEvent,
  ViewerZone,
} from "@/types/installed-base";

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
    status: "critical",
    operatingHours: 18420,
    cycles: 41280,
    lastService: "2026-03-18",
    lastReplacement: "2023-10-05",
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
    status: "healthy",
    operatingHours: 17960,
    cycles: 40110,
    lastService: "2026-06-02",
    lastReplacement: "2024-05-21",
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
    status: "attention",
    operatingHours: 12740,
    cycles: 28650,
    lastService: "2026-01-27",
    lastReplacement: null,
  },
];

// ---------------------------------------------------------------------------
// Assemblies & components — each IK-700 shares the same placeholder structure.
// ---------------------------------------------------------------------------

type AssemblyKey = "gearbox" | "carriage" | "feed-tube" | "lance-tube" | "poppet-valve";

const assemblyTemplate: { key: AssemblyKey; name: string; viewerZone: ViewerZone }[] = [
  { key: "gearbox", name: "Gearbox Assembly", viewerZone: "gearbox" },
  { key: "carriage", name: "Carriage", viewerZone: "carriage" },
  { key: "feed-tube", name: "Feed Tube", viewerZone: "feed_tube" },
  { key: "lance-tube", name: "Lance Tube", viewerZone: "lance_tube" },
  { key: "poppet-valve", name: "Poppet Valve", viewerZone: "poppet_valve" },
];

const assemblyStatus: Record<string, Partial<Record<AssemblyKey, HealthStatus>>> = {
  "ik700-10482": { gearbox: "critical", "poppet-valve": "unknown" },
  "ik700-10483": {},
  "ik700-10484": { carriage: "attention" },
};

export const assemblies: Assembly[] = assets.flatMap((asset) =>
  assemblyTemplate.map(({ key, name, viewerZone }) => ({
    id: `${asset.id}-${key}`,
    assetId: asset.id,
    name,
    viewerZone,
    status: assemblyStatus[asset.id]?.[key] ?? "healthy",
    operatingHours: asset.operatingHours,
    cycles: asset.cycles,
    lastService: asset.lastService,
    lastReplacement: key === "gearbox" ? asset.lastReplacement : null,
  })),
);

export const components: Component[] = assets.flatMap((asset) => {
  const gearboxId = `${asset.id}-gearbox`;
  const isCritical = asset.id === "ik700-10482";
  return [
    {
      id: `${asset.id}-bearing-b204`,
      assemblyId: gearboxId,
      name: "Bearing B-204",
      partNumber: "DEMO-B-204",
      viewerZone: "bearing",
      status: isCritical ? "critical" : "healthy",
      operatingHours: isCritical ? 6120 : 9450,
      cycles: isCritical ? 13840 : 21300,
      lastService: asset.lastService,
      lastReplacement: isCritical ? "2023-10-05" : null,
    },
    {
      id: `${asset.id}-gear-set`,
      assemblyId: gearboxId,
      name: "Gear Set",
      partNumber: "DEMO-GS-100",
      viewerZone: "gearbox",
      status: "healthy",
      operatingHours: asset.operatingHours,
      cycles: asset.cycles,
      lastService: asset.lastService,
      lastReplacement: null,
    },
  ] satisfies Component[];
});

// ---------------------------------------------------------------------------
// Conditions & recommendations
// ---------------------------------------------------------------------------

export const conditions: ActiveCondition[] = [
  {
    id: "cond-10482-vibration",
    assetId: "ik700-10482",
    targetLevel: "component",
    targetId: "ik700-10482-bearing-b204",
    title: "Elevated vibration at gearbox bearing",
    status: "critical",
    technicianConfirmed: false,
    evidence: [
      {
        level: "observed",
        statement: "Vibration = 4.8 mm/s",
        source: "Demo sensor channel · latest reading",
        recordedAt: "2026-09-28",
      },
      {
        level: "detected",
        statement: "Vibration exceeds the established demo baseline (2.5 mm/s).",
        source: "Demo baseline comparison",
        recordedAt: "2026-09-28",
      },
      {
        level: "inferred",
        statement: "Possible gearbox/bearing degradation.",
        source: "Pattern hypothesis · requires physical verification",
        recordedAt: null,
      },
      {
        level: "confirmed",
        statement: "No technician-confirmed failure.",
        source: "Service records",
        recordedAt: null,
      },
    ],
  },
  {
    id: "cond-10482-temperature",
    assetId: "ik700-10482",
    targetLevel: "assembly",
    targetId: "ik700-10482-gearbox",
    title: "Gearbox temperature above demo baseline",
    status: "attention",
    technicianConfirmed: false,
    evidence: [
      {
        level: "observed",
        statement: "Gearbox temperature = 74 °C",
        source: "Demo sensor channel · latest reading",
        recordedAt: "2026-09-28",
      },
      {
        level: "detected",
        statement: "Temperature is above the demo baseline (65 °C) and trending upward.",
        source: "Demo baseline comparison",
        recordedAt: "2026-09-28",
      },
      {
        level: "inferred",
        statement: "Possible lubrication or load-related issue.",
        source: "Pattern hypothesis · requires physical verification",
        recordedAt: null,
      },
      {
        level: "confirmed",
        statement: "No technician-confirmed failure.",
        source: "Service records",
        recordedAt: null,
      },
    ],
  },
  {
    id: "cond-10484-travel",
    assetId: "ik700-10484",
    targetLevel: "assembly",
    targetId: "ik700-10484-carriage",
    title: "Travel time longer than demo baseline",
    status: "attention",
    technicianConfirmed: false,
    evidence: [
      {
        level: "observed",
        statement: "Travel time = 101 s",
        source: "Demo sensor channel · latest cycle",
        recordedAt: "2026-09-28",
      },
      {
        level: "detected",
        statement: "Travel time exceeds the demo baseline (92 s).",
        source: "Demo baseline comparison",
        recordedAt: "2026-09-28",
      },
      {
        level: "inferred",
        statement: "Possible carriage drag or track obstruction.",
        source: "Pattern hypothesis · requires physical verification",
        recordedAt: null,
      },
      {
        level: "confirmed",
        statement: "No technician-confirmed failure.",
        source: "Service records",
        recordedAt: null,
      },
    ],
  },
];

export const recommendations: InspectionRecommendation[] = [
  {
    id: "rec-10482-bearing",
    assetId: "ik700-10482",
    targetId: "ik700-10482-bearing-b204",
    priority: "prompt",
    action: "Inspect Bearing B-204 for play, noise and lubricant condition.",
    rationale: "Vibration above demo baseline. The degradation hypothesis needs physical verification.",
  },
  {
    id: "rec-10482-gearbox",
    assetId: "ik700-10482",
    targetId: "ik700-10482-gearbox",
    priority: "planned",
    action: "Check gearbox oil level and condition at next planned access.",
    rationale: "Temperature trending above demo baseline.",
  },
  {
    id: "rec-10484-carriage",
    assetId: "ik700-10484",
    targetId: "ik700-10484-carriage",
    priority: "planned",
    action: "Inspect carriage wheels and track for binding or debris.",
    rationale: "Travel time above demo baseline.",
  },
];

// ---------------------------------------------------------------------------
// Sensor channels & readings (deterministic synthetic series)
// ---------------------------------------------------------------------------

const channelTemplate: {
  key: SensorChannelKey;
  label: string;
  unit: string;
  baseline: number;
  targets: string[];
}[] = [
  { key: "vibration", label: "Vibration", unit: "mm/s", baseline: 2.5, targets: ["gearbox", "bearing-b204"] },
  { key: "gearbox_temperature", label: "Gearbox temperature", unit: "°C", baseline: 65, targets: ["gearbox", "bearing-b204", "gear-set"] },
  { key: "motor_current", label: "Motor current", unit: "A", baseline: 4.2, targets: ["carriage"] },
  { key: "travel_time", label: "Travel time", unit: "s", baseline: 92, targets: ["carriage", "lance-tube"] },
];

export const sensorChannels: SensorChannel[] = assets.flatMap((asset) =>
  channelTemplate.map(({ key, label, unit, baseline, targets }) => ({
    id: `${asset.id}-${key}`,
    assetId: asset.id,
    key,
    label,
    unit,
    baseline,
    targetIds: targets.map((t) => `${asset.id}-${t}`),
  })),
);

/** Series shape per channel: [typical value, noise amplitude, final value]. */
const seriesProfile: Record<string, Record<SensorChannelKey, [number, number, number]>> = {
  "ik700-10482": {
    vibration: [2.1, 0.25, 4.8],
    gearbox_temperature: [61, 2, 74],
    motor_current: [4.0, 0.15, 4.1],
    travel_time: [90, 1.2, 91],
  },
  "ik700-10483": {
    vibration: [1.9, 0.2, 1.9],
    gearbox_temperature: [59, 2, 60],
    motor_current: [3.9, 0.15, 3.9],
    travel_time: [89, 1.2, 89],
  },
  "ik700-10484": {
    vibration: [2.0, 0.2, 2.2],
    gearbox_temperature: [60, 2, 62],
    motor_current: [4.0, 0.15, 4.15],
    travel_time: [91, 1.2, 101],
  },
};

const SERIES_DAYS = 30;
const SERIES_END = Date.UTC(2026, 8, 28);
const DAY_MS = 86_400_000;
/** Index where a drifting channel starts to move toward its final value. */
const DRIFT_START = 18;

function round(value: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function buildSeries(channel: SensorChannel, seed: number): SensorReading[] {
  const [typical, noise, final] = seriesProfile[channel.assetId][channel.key];
  const digits = channel.unit === "mm/s" || channel.unit === "A" ? 2 : 1;
  return Array.from({ length: SERIES_DAYS }, (_, i) => {
    const drift =
      i < DRIFT_START ? 0 : ((final - typical) * (i - DRIFT_START)) / (SERIES_DAYS - 1 - DRIFT_START);
    const wobble = noise * (0.6 * Math.sin(i * 1.7 + seed) + 0.4 * Math.sin(i * 0.43 + seed * 2.1));
    const value = i === SERIES_DAYS - 1 ? final : typical + drift + wobble;
    return {
      channelId: channel.id,
      timestamp: new Date(SERIES_END - (SERIES_DAYS - 1 - i) * DAY_MS).toISOString().slice(0, 10),
      value: round(value, digits),
    };
  });
}

export const sensorReadings: SensorReading[] = sensorChannels.flatMap((channel, index) =>
  buildSeries(channel, index + 1),
);

// ---------------------------------------------------------------------------
// Service history, documents and parts
// ---------------------------------------------------------------------------

export const serviceEvents: ServiceEvent[] = assets.flatMap((asset, index) => {
  const sn = asset.serialNumber;
  const events: ServiceEvent[] = [
    {
      id: `svc-${sn}-commissioning`,
      assetId: asset.id,
      targetId: asset.id,
      date: asset.installedDate,
      type: "commissioning",
      summary: "Demo commissioning record.",
      performedBy: "Demo field service",
      workOrder: `DEMO-WO-${sn}-001`,
    },
    {
      id: `svc-${sn}-lube`,
      assetId: asset.id,
      targetId: `${asset.id}-gearbox`,
      date: `2025-0${4 + index}-14`,
      type: "lubrication",
      summary: "Demo gearbox lubrication record.",
      performedBy: "Demo site maintenance",
      workOrder: `DEMO-WO-${sn}-014`,
    },
    {
      id: `svc-${sn}-inspection`,
      assetId: asset.id,
      targetId: asset.id,
      date: asset.lastService ?? asset.installedDate,
      type: "inspection",
      summary: "Demo routine outage inspection record.",
      performedBy: "Demo field service",
      workOrder: `DEMO-WO-${sn}-022`,
    },
  ];
  if (asset.lastReplacement) {
    events.push({
      id: `svc-${sn}-bearing`,
      assetId: asset.id,
      targetId: `${asset.id}-bearing-b204`,
      date: asset.lastReplacement,
      type: "replacement",
      summary: "Demo bearing replacement record.",
      performedBy: "Demo field service",
      workOrder: `DEMO-WO-${sn}-018`,
    });
  }
  return events;
});

export const documents: DocumentRecord[] = assets.flatMap((asset) => {
  const sn = asset.serialNumber;
  const id = (key: string) => `${asset.id}-${key}`;
  return [
    {
      id: `doc-${sn}-ga`,
      assetId: asset.id,
      targetIds: [asset.id],
      kind: "drawing",
      title: "General arrangement (demo placeholder)",
      documentNumber: `DEMO-DWG-${sn}-00`,
      revision: "C",
      updated: "2024-02-09",
    },
    {
      id: `doc-${sn}-gearbox-dwg`,
      assetId: asset.id,
      targetIds: [id("gearbox"), id("bearing-b204"), id("gear-set")],
      kind: "drawing",
      title: "Gearbox assembly drawing (demo placeholder)",
      documentNumber: `DEMO-DWG-${sn}-10`,
      revision: "B",
      updated: "2023-10-01",
    },
    {
      id: `doc-${sn}-carriage-dwg`,
      assetId: asset.id,
      targetIds: [id("carriage")],
      kind: "drawing",
      title: "Carriage assembly drawing (demo placeholder)",
      documentNumber: `DEMO-DWG-${sn}-20`,
      revision: "A",
      updated: "2022-06-15",
    },
    {
      id: `doc-${sn}-pi-main`,
      assetId: asset.id,
      targetIds: [asset.id, id("feed-tube"), id("lance-tube"), id("poppet-valve")],
      kind: "pi_sheet",
      title: "PI sheet · sootblower overview (demo placeholder)",
      documentNumber: `DEMO-PI-${sn}-01`,
      revision: "D",
      updated: "2024-02-09",
    },
    {
      id: `doc-${sn}-pi-gearbox`,
      assetId: asset.id,
      targetIds: [id("gearbox"), id("bearing-b204"), id("gear-set"), id("carriage")],
      kind: "pi_sheet",
      title: "PI sheet · drive & gearbox (demo placeholder)",
      documentNumber: `DEMO-PI-${sn}-02`,
      revision: "B",
      updated: "2023-10-01",
    },
  ] satisfies DocumentRecord[];
});

const partTemplate: { target: string; partNumber: string; description: string; quantity: number }[] = [
  { target: "bearing-b204", partNumber: "DEMO-B-204", description: "Bearing (demo placeholder)", quantity: 1 },
  { target: "gear-set", partNumber: "DEMO-GS-100", description: "Gear set (demo placeholder)", quantity: 1 },
  { target: "gearbox", partNumber: "DEMO-GBX-SEAL", description: "Gearbox seal kit (demo placeholder)", quantity: 1 },
  { target: "carriage", partNumber: "DEMO-CAR-WHL", description: "Carriage wheel (demo placeholder)", quantity: 4 },
  { target: "feed-tube", partNumber: "DEMO-FT-PKG", description: "Feed tube packing (demo placeholder)", quantity: 1 },
  { target: "lance-tube", partNumber: "DEMO-LT-NZL", description: "Nozzle head (demo placeholder)", quantity: 1 },
  { target: "poppet-valve", partNumber: "DEMO-PV-SEAT", description: "Valve seat (demo placeholder)", quantity: 1 },
];

export const parts: PartRecord[] = assets.flatMap((asset) =>
  partTemplate.map((part, index) => ({
    id: `${asset.id}-part-${index + 1}`,
    assetId: asset.id,
    targetId: `${asset.id}-${part.target}`,
    partNumber: part.partNumber,
    description: part.description,
    quantity: part.quantity,
    itemNumber: index + 1,
  })),
);
