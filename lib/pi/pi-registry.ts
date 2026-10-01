/**
 * Central registry of interactive PI forms and a cached loader for their
 * local manifests. Components never hard-code PI forms or asset paths.
 *
 * SECURITY: PI engineering assets (public/pi/) are local internal prototype
 * assets derived from internal engineering documents. They are gitignored and
 * must not be included in a public deployment without approval.
 */

import type { PIFormEntry, PIManifest } from "./pi-types";

export const PI_FORMS: Record<string, PIFormEntry> = {
  "4066": {
    form: "4066",
    label: "PI 4066",
    title: "Series One Carriage Assembly",
    equipmentModels: ["IK-700"],
    assembly: "Carriage / Gearbox",
    // Local, gitignored asset (see .gitignore: public/pi/).
    manifestUrl: "/pi/pi-4066/manifest.json",
  },
};

export type ManifestState =
  | { status: "loading" }
  | { status: "ready"; manifest: PIManifest; baseUrl: string }
  | { status: "unavailable" };

const cache = new Map<string, Promise<ManifestState>>();

/** Callouts in image pixels, whatever the manifest stores. */
function toPixels(manifest: PIManifest): PIManifest {
  if (manifest.coordinates !== "normalized") return manifest;
  const size = new Map(manifest.sheets.map((s) => [s.id, s]));
  return {
    ...manifest,
    coordinates: "pixels",
    items: manifest.items.map((item) => ({
      ...item,
      callouts: item.callouts.flatMap((c) => {
        const sheet = size.get(c.sheet);
        if (!sheet) return [];
        return [{ sheet: c.sheet, x: c.x * sheet.width, y: c.y * sheet.height, r: c.r === undefined ? undefined : c.r * sheet.width }];
      }),
    })),
  };
}

function isManifest(value: unknown): value is PIManifest {
  const m = value as PIManifest;
  return Boolean(m && typeof m.form === "string" && Array.isArray(m.sheets) && Array.isArray(m.items));
}

/** Load a form's manifest once per page session; missing assets resolve to "unavailable". */
export function loadPIManifest(form: string): Promise<ManifestState> {
  const entry = PI_FORMS[form];
  if (!entry) return Promise.resolve({ status: "unavailable" });
  let pending = cache.get(form);
  if (!pending) {
    pending = fetch(entry.manifestUrl)
      .then(async (r) => {
        if (!r.ok) return { status: "unavailable" } as const;
        const json: unknown = await r.json();
        if (!isManifest(json)) return { status: "unavailable" } as const;
        return {
          status: "ready",
          manifest: toPixels(json),
          baseUrl: entry.manifestUrl.slice(0, entry.manifestUrl.lastIndexOf("/") + 1),
        } as const;
      })
      .catch(() => ({ status: "unavailable" }) as const);
    cache.set(form, pending);
  }
  return pending;
}

/** Sheet holding the first callout of an item, if any. */
export function sheetOfItem(manifest: PIManifest, item: string | null): string | null {
  if (!item) return null;
  return manifest.items.find((i) => i.item === item)?.callouts[0]?.sheet ?? null;
}
