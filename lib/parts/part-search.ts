/**
 * Catalog search over indexed PI data only. Matches part number (exact or
 * partial, ignoring dashes / brackets), PI item number, description, category,
 * assembly and mapped IBIS component names.
 */

import type { CatalogPart, PartCategory, PartsCatalog } from "@/types/parts-commerce";
import { CATEGORY_LABEL } from "./catalog";
import { componentName, type ComponentNames } from "./part-context";

export interface CatalogFilters {
  query: string;
  category: PartCategory | null;
  sheet: string | null;
}

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9.]/g, "");

/** Relevance score; 0 = no match. */
export function scorePart(part: CatalogPart, assembly: string, rawQuery: string, names: ComponentNames): number {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 1;
  const items = part.references.map((r) => r.item);
  // "item 36", "#36", "pi 4066 item 36", "36" -> PI item lookup.
  const itemQuery = query.replace(/^(pi\s*\d+\s*[·-]?\s*)?(item|pos\.?|#)\s*/, "");
  const pn = part.partNumber ? compact(part.partNumber) : "";
  const q = compact(query);
  const components = part.componentKeys.map((k) => componentName(names, k).toLowerCase());
  const text = [part.description, CATEGORY_LABEL[part.category], assembly, ...components].join(" ").toLowerCase();

  let score = 0;
  if (items.includes(itemQuery)) score += 100;
  else if (/^\d+$/.test(itemQuery) && items.some((i) => i.split(".")[0] === itemQuery)) score += 60;
  if (pn && q.length >= 3) {
    if (pn === q) score += 90;
    else if (pn.startsWith(q)) score += 50;
    else if (pn.includes(q)) score += 30;
  }
  if (components.includes(query)) score += 80;
  if (CATEGORY_LABEL[part.category].toLowerCase().includes(query)) score += 10;
  if (text.includes(query)) score += 40;
  const tokens = query.split(/[\s,]+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((t) => text.includes(t))) score += 20 + tokens.length;
  return score;
}

export function searchCatalog(catalog: PartsCatalog, filters: CatalogFilters, names: ComponentNames): CatalogPart[] {
  const scored = catalog.parts
    .filter((p) => !filters.category || p.category === filters.category)
    .filter((p) => !filters.sheet || p.references.some((r) => r.sheetIds.includes(filters.sheet!)))
    .map((part, index) => ({ part, index, score: scorePart(part, catalog.assembly, filters.query, names) }))
    .filter((r) => r.score > 0);
  if (filters.query.trim()) scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map((r) => r.part);
}
