/**
 * Maps installed-base entities to named objects in the local IK-700
 * visualization model (public/models/ik700-v3.glb — gitignored, internal).
 *
 * Keys are entity template keys (entity id without the "<assetId>-" prefix),
 * so every IK-700 asset shares one mapping. Only GLB object NAMES are used;
 * nothing depends on mesh traversal order.
 */

import type { HealthStatus } from "@/types/installed-base";

export const IK700_MODEL = {
  url: "/models/ik700-v3.glb",
  rootObject: "IK700",
  /** Equipment models that use this visualization. */
  equipmentModels: ["IK-700"],
  notice: ["Visualization model", "Representative geometry", "Not manufacturing CAD"],
} as const;

/** Camera / emphasis mode for a selection. */
export type ModelView = "asset" | "carriage" | "gearbox" | "component";

export type MappingConfidence = "direct" | "representative" | "unmapped";

export interface ContextRule {
  /** GLB object whose subtree keeps this opacity (most specific rule listed first). */
  object: string;
  opacity: number;
}

export interface EntityModelMapping {
  /** GLB objects that ARE this entity (selection highlight + click target). */
  objects: string[];
  view: ModelView;
  /** Objects frame the camera on (defaults to `objects`). */
  frame?: string[];
  /** Surrounding geometry kept visible for orientation in component view. */
  context?: ContextRule[];
  /** Exterior surfaces that display this entity's health (e.g. a housing). */
  healthObjects: string[];
  /** Tint every mesh under these objects with this entity's health (subtle). */
  internalHealth?: string[];
  confidence: MappingConfidence;
  note?: string;
}

const GEARBOX_CONTEXT: ContextRule[] = [
  { object: "Gearbox", opacity: 0.35 },
  { object: "Carriage", opacity: 0.25 },
];

const internal = (object: string, note?: string): EntityModelMapping => ({
  objects: [object],
  view: "component",
  context: GEARBOX_CONTEXT,
  healthObjects: [],
  confidence: "direct",
  note,
});

export const ASSET_KEY = "asset";

export const ENTITY_MODEL_MAP: Record<string, EntityModelMapping> = {
  [ASSET_KEY]: { objects: [IK700_MODEL.rootObject], view: "asset", healthObjects: [], confidence: "direct" },

  carriage: {
    objects: ["Carriage"],
    view: "carriage",
    healthObjects: ["CarriageHousing", "TopCover", "DrivePinions", "CarriageRollers"],
    confidence: "direct",
  },
  motor: {
    objects: ["Motor"],
    view: "component",
    context: [{ object: "Carriage", opacity: 0.6 }],
    healthObjects: ["Motor"],
    confidence: "direct",
  },
  gearbox: {
    objects: ["Gearbox"],
    view: "gearbox",
    // The Series One carriage casing is the gearbox's physical housing, so
    // gearbox health shows on the housing exterior at asset level.
    healthObjects: ["CarriageHousing", "TopCover", "ChangeGearHousing"],
    internalHealth: ["Gearbox"],
    confidence: "direct",
    note: "Model 'Gearbox' is an application group inside the carriage, not a second housing.",
  },
  "gear-set": {
    objects: ["WormGear", "DriveGear", "TranslationGear", "BevelGear", "BevelPinion"],
    view: "component",
    frame: ["Gearbox"],
    context: GEARBOX_CONTEXT,
    healthObjects: [],
    confidence: "representative",
    note: "Demo 'Gear Set' shown as the model's drive-train gears; each gear is also its own entity.",
  },
  "worm-gear": internal("WormGear"),
  "drive-gear": internal("DriveGear"),
  "translation-gear": internal("TranslationGear"),
  "bevel-gear": internal("BevelGear"),
  "bevel-pinion": internal("BevelPinion"),
  "worm-shaft": internal("WormShaft"),
  "lance-hub-drive-shaft": internal("LanceHubDriveShaft"),
  "pinion-shaft": internal("PinionShaft"),
  // Primary component-level demo issue: shows its own health on the model part.
  "worm-thrust-bearing-a": { ...internal("WormThrustBearing_A"), healthObjects: ["WormThrustBearing_A"] },
  "worm-thrust-bearing-b": internal("WormThrustBearing_B"),
  "lance-hub-bearing-front": internal("LanceHubBearing_Front"),
  "lance-hub-bearing-rear": internal("LanceHubBearing_Rear"),
  "drive-shaft-bearing-inner": internal("DriveShaftBearing_Inner"),
  "drive-shaft-bearing-outer": internal("DriveShaftBearing_Outer"),
  "pinion-shaft-bearing-left": internal("PinionShaftBearing_Left"),
  "pinion-shaft-bearing-right": internal("PinionShaftBearing_Right"),

  "feed-tube": {
    objects: ["FeedTube"],
    view: "component",
    context: [{ object: "PoppetValve", opacity: 0.6 }, { object: "Carriage", opacity: 0.45 }],
    healthObjects: ["FeedTube"],
    confidence: "direct",
  },
  "lance-tube": {
    objects: ["LanceTube", "NozzleAssembly"],
    view: "component",
    context: [{ object: "FrontSupport", opacity: 0.6 }, { object: "Carriage", opacity: 0.45 }],
    healthObjects: ["LanceTube", "NozzleAssembly"],
    confidence: "representative",
    note: "Nozzle assembly is shown as part of the lance tube.",
  },
  "poppet-valve": {
    objects: ["PoppetValve"],
    view: "component",
    context: [{ object: "FeedTube", opacity: 0.6 }, { object: "Carriage", opacity: 0.45 }],
    healthObjects: ["PoppetValve"],
    confidence: "direct",
  },
};

/** Entity template key from an entity id ("ik700-10482-worm-gear" -> "worm-gear"). */
export function entityKey(assetId: string, entityId: string): string {
  return entityId === assetId ? ASSET_KEY : entityId.slice(assetId.length + 1);
}

export function entityIdForKey(assetId: string, key: string): string {
  return key === ASSET_KEY ? assetId : `${assetId}-${key}`;
}

export function mappingFor(assetId: string, entityId: string): EntityModelMapping | null {
  return ENTITY_MODEL_MAP[entityKey(assetId, entityId)] ?? null;
}

/**
 * GLB object -> entity key for click resolution. Single-object mappings claim
 * their object first, so a click on WormGear selects Worm Gear, not Gear Set.
 * Clicks on unlisted meshes resolve by walking up to the nearest listed
 * ancestor (e.g. a retainer -> Gearbox, the beam -> the asset).
 */
export const CLICK_TARGETS: Record<string, string> = (() => {
  const targets: Record<string, string> = {};
  const entries = Object.entries(ENTITY_MODEL_MAP).filter(([, m]) => m.confidence !== "unmapped");
  for (const pass of [1, 2]) {
    for (const [key, m] of entries) {
      if ((pass === 1) !== (m.objects.length === 1)) continue;
      for (const object of m.objects) targets[object] ??= key;
    }
  }
  return targets;
})();

export const HOUSING_OBJECTS = ["CarriageHousing", "TopCover", "CarriageTopBar"];
export const BEAM_OBJECT = "Beam";

export type HealthByObject = Map<string, HealthStatus>;
