/**
 * Parts catalog adapter. Normalizes the local interactive PI manifest into
 * catalog parts at runtime, so no PI-derived catalog is committed.
 *
 * Nothing is invented: description, part number and listed quantity come
 * from the manifest verbatim. Category is a display grouping derived from the
 * documented description. Positions without a documented name (e.g. the
 * generic lance hub callout "9", itemized only as 9.1–9.4) are not listed.
 *
 * SECURITY: the manifest lives under public/pi/ (gitignored, local only).
 * When it is missing the catalog is "unavailable" and the UI falls back to
 * Contact Us; basket lines carry their own snapshot and still render.
 */

import { entityKeysForItem } from "@/lib/pi/pi-component-map";
import { PI_FORMS } from "@/lib/pi/pi-registry";
import type { PIManifest } from "@/lib/pi/pi-types";
import type { CatalogPart, PartCategory, PartsCatalog, PartSourceRef } from "@/types/parts-commerce";

/** Only form currently indexed for the catalog. */
export const CATALOG_FORM = "4066";
export const CATALOG_FAMILY = "IK-700";

export const CATEGORY_LABEL: Record<PartCategory, string> = {
  bearings: "Bearings",
  gears: "Gears & pinions",
  "shafts-keys": "Shafts & keys",
  "seals-gaskets": "Seals, gaskets & O-rings",
  "shims-spacers": "Shims & spacers",
  "housings-retainers": "Housings, covers & retainers",
  rollers: "Rollers & brackets",
  "lance-hub": "Lance hubs",
  fasteners: "Fasteners & retaining rings",
  other: "Fittings & accessories",
};

export const CATEGORY_ORDER: PartCategory[] = [
  "bearings",
  "gears",
  "shafts-keys",
  "lance-hub",
  "seals-gaskets",
  "housings-retainers",
  "rollers",
  "shims-spacers",
  "fasteners",
  "other",
];

/** First matching rule wins; tested against the documented description. */
const CATEGORY_RULES: [RegExp, PartCategory][] = [
  [/^LANCE HUB/, "lance-hub"],
  [/^(BEARING RETAINER|BEARING CARRIER)/, "housings-retainers"],
  [/BEARING/, "bearings"],
  [/^(SEAL|GASKET|RING, "O")/, "seals-gaskets"],
  [/^(SHIM|SPACER)/, "shims-spacers"],
  [/(RETAINING|^SCREW|^WASHER|^NUT|^LOCKNUT|^LOCK WASHER|^ROLL PIN)/, "fasteners"],
  [/^(HOUSING|COVER|CHANGE GEAR HOUSING|MOUNTING FLANGE)/, "housings-retainers"],
  [/GEAR/, "gears"],
  [/(SHAFT|^KEY)/, "shafts-keys"],
  [/ROLLER/, "rollers"],
];

export function categorize(description: string): PartCategory {
  const text = description.toUpperCase();
  return CATEGORY_RULES.find(([re]) => re.test(text))?.[1] ?? "other";
}

/** "(123456-0000)" -> bracketed; "" / undefined -> missing. */
function parsePartNumber(raw: string | undefined) {
  const value = raw?.trim() ?? "";
  if (!value) return { partNumber: null, status: "missing" as const };
  const bracketed = /^\(.*\)$/.test(value);
  return { partNumber: bracketed ? value.slice(1, -1).trim() : value, status: bracketed ? ("bracketed" as const) : ("documented" as const) };
}

export function catalogIdFor(form: string, item: string): string {
  return `pi${form}-${item}`;
}

export const sourceLabel = (ref: Pick<PartSourceRef, "formLabel" | "item">) => `${ref.formLabel} · Item ${ref.item}`;

const VARIANT_HINT: Record<string, string> = {
  "9": "feed tube size and packing arrangement",
  "51": "lance travel speed and helix",
  "58": "lance travel speed and helix",
  "60": "the lance hub variant fitted",
  "66": "helix",
  "67": "helix",
};

export function buildCatalog(manifest: PIManifest): PartsCatalog {
  const form = PI_FORMS[manifest.form] ?? PI_FORMS[CATALOG_FORM];
  const sheetLabel = new Map(manifest.sheets.map((s) => [s.id, s.label.split(" · ")[0]]));
  const assembly = manifest.title ?? form.title;

  const byKey = new Map<string, CatalogPart>();
  for (const item of manifest.items) {
    if (!item.name) continue;
    const { partNumber, status } = parsePartNumber(item.partNumber);
    const sheetIds = [...new Set(item.callouts.map((c) => c.sheet))];
    const ref: PartSourceRef = {
      form: manifest.form,
      formLabel: form.label,
      item: item.item,
      sheetIds,
      sheets: sheetIds.map((id) => sheetLabel.get(id) ?? id),
      listedQuantity: item.quantity === undefined || item.quantity === "" ? null : String(item.quantity),
      notes: item.notes ?? null,
    };
    const id = catalogIdFor(manifest.form, item.item);
    // Same documented part number at several positions -> one part, several references.
    const key = partNumber ? `pn:${partNumber.toUpperCase()}` : `id:${id}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.aliases.push(id);
      existing.references.push(ref);
      continue;
    }
    const variantGroup = item.item.includes(".") ? item.item.split(".")[0] : null;
    byKey.set(key, {
      id,
      aliases: [],
      description: item.name,
      partNumber,
      partNumberStatus: status,
      category: categorize(item.name),
      equipmentFamily: CATALOG_FAMILY,
      assembly,
      references: [ref],
      variantGroup,
      componentKeys: [],
      confirmationReasons: [],
    });
  }

  const parts = [...byKey.values()];
  for (const part of parts) {
    part.componentKeys = [...new Set(part.references.flatMap((r) => entityKeysForItem(r.form, r.item)))];
    const reasons: string[] = [];
    if (part.partNumberStatus === "bracketed")
      reasons.push(
        "The part number is printed in parentheses on the PI parts list. What the brackets denote (e.g. a purchased or reference-only number) is not confirmed.",
      );
    if (part.partNumberStatus === "missing") reasons.push("No part number is listed for this PI position.");
    if (part.variantGroup) {
      const hint = VARIANT_HINT[part.variantGroup];
      reasons.push(
        `PI ${manifest.form} lists alternatives for item ${part.variantGroup}${hint ? ` that depend on ${hint}` : ""}. The variant fitted to the unit must be confirmed.`,
      );
    }
    if (part.references.some((r) => r.notes && /unresolved|does not match/i.test(r.notes)))
      reasons.push("The source document contains an unresolved note for this item.");
    if (part.references.length > 1) reasons.push("The same part number appears at more than one PI position.");
    part.confirmationReasons = reasons;
  }

  return {
    family: CATALOG_FAMILY,
    assembly,
    formLabel: form.label,
    source: manifest.source ?? null,
    sheets: manifest.sheets
      .filter((s) => parts.some((p) => p.references.some((r) => r.sheetIds.includes(s.id))))
      .map((s) => ({ id: s.id, label: s.label })),
    parts: parts.sort(compareItems),
  };
}

/** Natural PI item order: 9 < 9.1 < 10 < 51.2. */
function compareItems(a: CatalogPart, b: CatalogPart) {
  const [ai, af = "0"] = a.references[0].item.split(".");
  const [bi, bf = "0"] = b.references[0].item.split(".");
  return Number(ai) - Number(bi) || Number(af) - Number(bf);
}

export function findPart(catalog: PartsCatalog, id: string): CatalogPart | null {
  const key = id.toLowerCase();
  return catalog.parts.find((p) => p.id === key || p.aliases.includes(key)) ?? null;
}

/** Catalog part documented at a PI position, if the position is indexed. */
export function partForPIItem(catalog: PartsCatalog, form: string, item: string): CatalogPart | null {
  return findPart(catalog, catalogIdFor(form, item));
}

/** Other alternatives in the same PI variant group. */
export function variantSiblings(catalog: PartsCatalog, part: CatalogPart): CatalogPart[] {
  if (!part.variantGroup) return [];
  return catalog.parts.filter((p) => p.id !== part.id && p.variantGroup === part.variantGroup);
}
