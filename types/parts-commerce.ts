/**
 * Parts & Support types. This is an inquiry (RFQ) workflow, not commerce:
 * there are deliberately no price, stock, lead-time or order fields.
 */

/** Where a catalog part is documented: one position on a PI form. */
export interface PartSourceRef {
  /** PI form number, e.g. "4066". */
  form: string;
  /** Display label, e.g. "PI 4066". */
  formLabel: string;
  /** PI item number (document position). NOT an orderable part number. */
  item: string;
  /** Sheets carrying a callout for the item, e.g. ["Sheet 2", "Sheet 3"]. */
  sheets: string[];
  sheetIds: string[];
  /** Quantity exactly as listed on the PI parts list (no interpretation). */
  listedQuantity: string | null;
  /** Note recorded against the item in the local PI manifest. */
  notes: string | null;
}

/**
 * How the part number is documented:
 * - documented: plain part number on the PI parts list
 * - bracketed: number printed in parentheses; its meaning is not confirmed
 * - missing: no part number listed for the position
 */
export type PartNumberStatus = "documented" | "bracketed" | "missing";

export type PartCategory =
  | "bearings"
  | "gears"
  | "shafts-keys"
  | "seals-gaskets"
  | "shims-spacers"
  | "housings-retainers"
  | "rollers"
  | "lance-hub"
  | "fasteners"
  | "other";

export interface CatalogPart {
  /** Stable catalog id, e.g. "pi4066-36" (primary PI position). */
  id: string;
  /** Other ids that resolve to this part (same part number at another PI position). */
  aliases: string[];
  /** Part description exactly as documented. */
  description: string;
  /** Part number as documented (brackets removed); null when missing. */
  partNumber: string | null;
  partNumberStatus: PartNumberStatus;
  category: PartCategory;
  equipmentFamily: string;
  /** Assembly the PI form documents, e.g. "Series One Carriage Assembly". */
  assembly: string;
  references: PartSourceRef[];
  /** Variant group, e.g. "51" for 51.1–51.4, when the PI lists alternatives. */
  variantGroup: string | null;
  /** IBIS component template keys with a confirmed mapping to this PI item. */
  componentKeys: string[];
  /** Reasons the reference must be confirmed before quotation (empty = none specific). */
  confirmationReasons: string[];
}

export interface PartsCatalog {
  family: string;
  assembly: string;
  formLabel: string;
  source: string | null;
  sheets: { id: string; label: string }[];
  parts: CatalogPart[];
}

/** Equipment / component context carried from the asset into an inquiry. */
export interface EquipmentContext {
  assetId: string;
  assetName: string;
  model: string;
  serialNumber: string;
  plantName: string;
  unitName: string;
  customerName: string;
  /** Component selected on the asset when the inquiry started. */
  entityId: string | null;
  entityName: string | null;
}

/** One inquiry basket line. Identity: part id + equipment context. */
export interface InquiryLine {
  key: string;
  partId: string;
  description: string;
  partNumber: string | null;
  partNumberStatus: PartNumberStatus;
  /** "PI 4066 · Item 36" style references (document positions). */
  piReferences: string[];
  confirmationRequired: boolean;
  quantity: number;
  note: string;
  /** Equipment the part is requested for; null = no specific unit. */
  equipment: Omit<EquipmentContext, "entityId" | "entityName"> | null;
  /** IBIS components the line was added from (provenance only). */
  components: string[];
  /** Entity ids of those components, for navigating back to the asset. */
  componentIds?: string[];
  /** How the line entered the basket. */
  source: "catalog" | "asset-condition" | "asset-parts" | "outage-planning" | "pi-viewer";
  addedAt: string;
}

export interface InquiryBasket {
  version: 1;
  lines: InquiryLine[];
  note: string;
}
