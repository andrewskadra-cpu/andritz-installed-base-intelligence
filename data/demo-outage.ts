/**
 * DEMO DATA — planned outages and inspection checklist items used by the
 * outage-scope generator. Fictional; not an ANDRITZ procedure.
 */

import type { InspectionChecklistItem, PlannedOutage } from "@/types/outage";
import { assets } from "./demo-data";

export const plannedOutages: PlannedOutage[] = [
  {
    id: "riverbend-b1-2026-11",
    plantId: "riverbend-station",
    unitId: "boiler-1",
    name: "Boiler 1 Planned Outage · Nov 2026 (demo)",
    plannedStart: "2026-11-09",
    plannedEnd: "2026-11-20",
  },
];

/** Checklist template per node key; instantiated for every IK-700. */
const template: (Omit<InspectionChecklistItem, "id" | "assetId" | "entityId"> & { key: string })[] = [
  {
    key: "gearbox",
    action: "Consider verifying lubricant level and condition against the last recorded oil change.",
    relatedSignals: ["gearbox_temperature", "vibration"],
    serviceEventType: "lubrication",
    documentKinds: ["procedure"],
  },
  {
    key: "gearbox",
    action: "Consider verifying shaft alignment and coupling condition.",
    relatedSignals: ["vibration"],
    serviceEventType: null,
    documentKinds: ["drawing", "procedure"],
  },
  {
    key: "carriage",
    action: "Consider checking drive motor current draw during a supervised travel cycle.",
    relatedSignals: ["motor_current"],
    serviceEventType: null,
    documentKinds: ["drawing"],
  },
];

export const inspectionChecklist: InspectionChecklistItem[] = assets.flatMap((asset) =>
  template.map(({ key, ...item }, index) => ({
    ...item,
    id: `chk-${asset.serialNumber}-${index + 1}`,
    assetId: asset.id,
    entityId: `${asset.id}-${key}`,
  })),
);
