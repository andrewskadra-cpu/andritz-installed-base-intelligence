/**
 * IBIS entity <-> PI item mapping. The single place component-to-document
 * references are defined. Keys are entity template keys (shared by every
 * IK-700 asset).
 *
 * Only identities supported by approved project data are listed. Left out
 * on purpose: Drive Gear / Translation Gear (source numbering conflict),
 * Gear Set (demo grouping), pinion-shaft bearings (item not confirmed) and
 * the drive motor (not part of PI 4066).
 */

import type { PIReference } from "./pi-types";

const F = "4066";

export const PI_COMPONENT_MAP: Record<string, PIReference> = {
  // Form-level: the whole Series One carriage / gearbox.
  carriage: { form: F, item: null },
  gearbox: { form: F, item: null },
  // Item-level.
  "worm-shaft": { form: F, item: "35" },
  "worm-thrust-bearing-a": { form: F, item: "36" },
  "worm-thrust-bearing-b": { form: F, item: "36" },
  "pinion-shaft": { form: F, item: "4" },
  "worm-gear": { form: F, item: "63" },
  "lance-hub-drive-shaft": { form: F, item: "61" },
  "bevel-gear": { form: F, item: "10" },
  "bevel-pinion": { form: F, item: "79" },
  "lance-hub-bearing-front": { form: F, item: "11" },
  "lance-hub-bearing-rear": { form: F, item: "11" },
  "drive-shaft-bearing-inner": { form: F, item: "64" },
  "drive-shaft-bearing-outer": { form: F, item: "76" },
};

export function piReferenceFor(entityKey: string): PIReference | null {
  return PI_COMPONENT_MAP[entityKey] ?? null;
}

/**
 * Entity keys mapped to a PI item. More than one key means several physical
 * instances share the item (e.g. both worm thrust bearings): the caller must
 * not pick one arbitrarily.
 */
export function entityKeysForItem(form: string, item: string): string[] {
  return Object.entries(PI_COMPONENT_MAP)
    .filter(([, ref]) => ref.form === form && ref.item === item)
    .map(([key]) => key);
}
