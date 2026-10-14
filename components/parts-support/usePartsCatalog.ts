"use client";

import { useMemo } from "react";
import { usePIManifest } from "@/components/pi/usePIManifest";
import { buildCatalog, CATALOG_FORM } from "@/lib/parts/catalog";
import type { PartsCatalog } from "@/types/parts-commerce";

export type CatalogState =
  | { status: "loading" }
  | { status: "ready"; catalog: PartsCatalog }
  | { status: "unavailable" };

/** Catalog built from the local PI manifest (shared, cached loader). */
export function usePartsCatalog(): CatalogState {
  const state = usePIManifest(CATALOG_FORM);
  const manifest = state.status === "ready" ? state.manifest : null;
  const catalog = useMemo(() => (manifest ? buildCatalog(manifest) : null), [manifest]);
  if (state.status === "unavailable") return { status: "unavailable" };
  return catalog ? { status: "ready", catalog } : { status: "loading" };
}
