/**
 * Interactive PI (parts illustration) data contract.
 *
 * The registry (committed) only names PI forms and where their local assets
 * live. Sheet images, callout positions and item details are local,
 * gitignored assets (public/pi/<form>/manifest.json + images) because they
 * derive from internal engineering documents.
 */

/** One drawing sheet of a PI form. Coordinates are image pixels. */
export interface PISheet {
  id: string;
  label: string;
  /** Image file, relative to the manifest. */
  image: string;
  width: number;
  height: number;
}

/**
 * Clickable callout region for an item on a sheet. In a manifest the values
 * may be normalized (see PIManifest.coordinates); after loading they are
 * always image pixels.
 */
export interface PICallout {
  sheet: string;
  x: number;
  y: number;
  /** Circle radius; defaults to 18 px. */
  r?: number;
}

/** A PI item. Every field other than `item` is optional: never invented. */
export interface PIItem {
  item: string;
  name?: string;
  partNumber?: string;
  quantity?: number | string;
  notes?: string;
  callouts: PICallout[];
}

/** Local manifest file for one PI form. */
export interface PIManifest {
  form: string;
  title?: string;
  /** Where the sheets were taken from (local reference only). */
  source?: string;
  /**
   * "normalized": callout x / y are fractions of the sheet width / height and
   * r a fraction of the width. Default "pixels".
   */
  coordinates?: "pixels" | "normalized";
  sheets: PISheet[];
  items: PIItem[];
}

/** Committed registry entry (no engineering content). */
export interface PIFormEntry {
  form: string;
  /** Display label, e.g. "PI 4066". */
  label: string;
  title: string;
  equipmentModels: string[];
  assembly: string;
  manifestUrl: string;
}

/** Pointer from an IBIS entity to a PI form (and item when known). */
export interface PIReference {
  form: string;
  /** Null for a form-level reference (the whole assembly). */
  item: string | null;
}
