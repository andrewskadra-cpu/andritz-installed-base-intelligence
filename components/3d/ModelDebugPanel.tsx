"use client";

import { ENTITY_MODEL_MAP, entityIdForKey } from "@/lib/3d/ik700-model-map";
import type { HealthSurfaces, HousingMode } from "@/lib/3d/model-visual-state";
import type { AssetModel } from "@/lib/asset-model";

/** Development aid: verifies entity -> GLB mappings against the loaded model. */
export function ModelDebugPanel({
  model,
  selectedKey,
  objectNames,
  hovered,
  health,
  housingMode,
}: {
  model: AssetModel;
  selectedKey: string;
  objectNames: Set<string>;
  hovered: string | null;
  health: HealthSurfaces;
  housingMode: HousingMode;
}) {
  const assetId = model.rootId;
  return (
    // Compact by default so it never covers the model; details expand on demand.
    <div className="pointer-events-auto absolute bottom-12 left-3 z-30 max-h-[60%] w-[300px] overflow-auto rounded border border-line bg-panel/95 p-2 font-mono text-[10px] leading-tight text-ink-2 shadow-md">
      <div className="mb-1 font-sans text-[11px] font-semibold text-ink">3D model debug (development)</div>
      <div>selected: {selectedKey} · housing: {housingMode}</div>
      <div>hovered object: {hovered ?? "—"}</div>
      <div>model objects loaded: {objectNames.size}</div>
      <details className="mt-1">
        <summary className="cursor-pointer font-sans text-[11px] text-ink-3">Entity → GLB mapping</summary>
        <table className="mt-1.5 w-full">
          <thead>
            <tr className="text-left text-ink-3">
              <th>entity</th>
              <th>status</th>
              <th>GLB objects</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ENTITY_MODEL_MAP).map(([key, m]) => {
              const node = model.nodes[entityIdForKey(assetId, key)];
              return (
                <tr key={key} className={key === selectedKey ? "bg-info-soft" : ""}>
                  <td className="pr-1 align-top">{node ? key : `${key} (no entity)`}</td>
                  <td className="pr-1 align-top">{node?.status ?? "—"}</td>
                  <td className="align-top">
                    {m.objects.length === 0
                      ? `UNMAPPED`
                      : m.objects.map((o) => (objectNames.has(o) ? o : `${o}✗`)).join(", ")}
                    {m.confidence === "representative" ? " (repr.)" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </details>
      <details className="mt-1">
        <summary className="cursor-pointer font-sans text-[11px] text-ink-3">Health surfaces</summary>
        <div className="mt-1 text-ink-3">
          {[...health.surfaces].map(([o, s]) => `${o}=${s}`).join(", ")}
        </div>
      </details>
    </div>
  );
}
