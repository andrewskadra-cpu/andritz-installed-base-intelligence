"use client";

import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Box, Bug, Info, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META, STATUS_ORDER } from "@/components/ui/status";
import {
  ASSET_KEY,
  ENTITY_MODEL_MAP,
  IK700_MODEL,
  entityIdForKey,
  entityKey,
} from "@/lib/3d/ik700-model-map";
import { defaultHousingMode, deriveHealthSurfaces, type HousingMode } from "@/lib/3d/model-visual-state";
import type { AssetModel } from "@/lib/asset-model";
import type { Selection } from "@/lib/asset-selection";
import type { HealthStatus } from "@/types/installed-base";
import { ModelDebugPanel } from "./ModelDebugPanel";
import { ModelLoadingState } from "./ModelLoadingState";

const IK700Scene = dynamic(() => import("./IK700Scene"), { ssr: false });

type Availability = "checking" | "available" | "unavailable";

/** Keeps a model failure from taking down the asset page. */
class ModelErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const HOUSING_MODES: { mode: HousingMode; label: string }[] = [
  { mode: "normal", label: "Normal" },
  { mode: "faded", label: "Faded" },
  { mode: "hidden", label: "Hidden" },
];

/**
 * Real IK-700 visualization driven by the page's single selected-entity
 * state. Renders `fallback` (the placeholder viewer) when the local,
 * gitignored model file is unavailable or fails to load.
 */
export function IK700Viewer({
  model,
  selection,
  onSelect,
  fallback,
}: {
  model: AssetModel;
  selection: Selection;
  onSelect: (id: string | null) => void;
  fallback: ReactNode;
}) {
  const assetId = model.rootId;
  const selectedKey = entityKey(assetId, selection.node.id);
  const mapping = ENTITY_MODEL_MAP[selectedKey] ?? ENTITY_MODEL_MAP[ASSET_KEY];

  const [availability, setAvailability] = useState<Availability>("checking");
  const [loadFailed, setLoadFailed] = useState(false);
  const [objectNames, setObjectNames] = useState<Set<string> | null>(null);
  const [housingOverride, setHousingOverride] = useState<{ key: string; mode: HousingMode } | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const searchParams = useSearchParams();
  // Mapping debug: always available in development, via ?debug3d=1 otherwise.
  const debugAllowed = process.env.NODE_ENV !== "production" || searchParams.get("debug3d") === "1";

  // The model is intentionally gitignored: probe for it before loading.
  useEffect(() => {
    let cancelled = false;
    fetch(IK700_MODEL.url, { method: "HEAD" })
      .then((r) => !cancelled && setAvailability(r.ok ? "available" : "unavailable"))
      .catch(() => !cancelled && setAvailability("unavailable"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Health comes from the application's model (health engine output).
  // Keyed by a signature so live telemetry only repaints on status changes.
  const statusKey = Object.keys(ENTITY_MODEL_MAP)
    .map((k) => `${k}=${model.nodes[entityIdForKey(assetId, k)]?.status ?? ""}`)
    .join("|");
  const health = useMemo(() => {
    const statuses = new Map(statusKey.split("|").map((p) => p.split("=") as [string, string]));
    return deriveHealthSurfaces((k) => (statuses.get(k) || null) as HealthStatus | null);
  }, [statusKey]);

  const housingMode =
    housingOverride?.key === selectedKey ? housingOverride.mode : defaultHousingMode(mapping);

  const onPick = useCallback(
    (key: string) => onSelect(key === ASSET_KEY ? null : entityIdForKey(assetId, key)),
    [assetId, onSelect],
  );
  const onLoaded = useCallback((names: string[]) => setObjectNames(new Set(names)), []);

  if (availability === "unavailable" || loadFailed) {
    return (
      <div className="relative">
        {fallback}
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded border border-line bg-panel/95 px-2.5 py-1 text-[11px] text-ink-3 shadow-sm">
          Local IK-700 model not available · showing placeholder geometry
        </div>
      </div>
    );
  }

  const { node, path } = selection;
  const parent = path.length > 1 ? path[path.length - 2] : null;

  return (
    <div className="relative h-[420px] overflow-hidden rounded-md border border-line bg-[#f4f6f9] xl:h-[500px]">
      {availability === "available" && (
        <ModelErrorBoundary onError={() => setLoadFailed(true)}>
          <IK700Scene
            mapping={mapping}
            selectionKey={selection.node.id}
            health={health}
            housingMode={housingMode}
            resetToken={resetToken}
            onPick={onPick}
            onLoaded={onLoaded}
            onHover={setHovered}
          />
        </ModelErrorBoundary>
      )}
      {!objectNames && <ModelLoadingState checking={availability === "checking"} />}

      {/* Context card + controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3">
        <div className="pointer-events-auto rounded border border-line bg-panel/95 px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            <Box size={12} aria-hidden />
            {mapping.view === "asset" ? "Whole equipment" : `${mapping.view} view`}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">{node.name}</span>
            <StatusBadge status={node.status} size="sm" />
          </div>
          {parent && parent.type !== "asset" && <div className="mt-0.5 text-[11px] text-ink-3">within {parent.name}</div>}
          {mapping.confidence !== "direct" && mapping.note && (
            <div className="mt-1 max-w-64 text-[11px] leading-snug text-ink-3">{mapping.note}</div>
          )}
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setHousingOverride(null);
              setResetToken((n) => n + 1);
            }}
            className="flex items-center gap-1.5 rounded border border-line bg-panel/95 px-2.5 py-1.5 text-xs font-medium text-ink-2 shadow-sm hover:text-ink"
          >
            <RotateCcw size={13} aria-hidden /> Reset view
          </button>
          <div className="flex items-center gap-0.5 rounded border border-line bg-panel/95 p-0.5 text-[11px] shadow-sm" role="group" aria-label="Carriage housing">
            <span className="px-1.5 text-ink-3">Housing</span>
            {HOUSING_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                aria-pressed={housingMode === mode}
                onClick={() => setHousingOverride({ key: selectedKey, mode })}
                className={`rounded-sm px-2 py-0.5 font-medium ${housingMode === mode ? "bg-navy-900 text-white" : "text-ink-2 hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend + prototype notice */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-end justify-between gap-2 p-3">
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-line bg-panel/95 px-3 py-1.5 text-[11px] text-ink-2 shadow-sm">
          {STATUS_ORDER.map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s === "unknown" ? "#c5ccd6" : STATUS_META[s].hex }} />
              {STATUS_META[s].label}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm border-2 border-[#2f6fdf]" />
            Selected
          </li>
        </ul>
        <div className="flex items-center gap-2">
          {debugAllowed && (
            <button
              type="button"
              onClick={() => setDebugOpen((v) => !v)}
              aria-pressed={debugOpen}
              title="Model mapping debug (development)"
              className="pointer-events-auto grid size-7 place-items-center rounded border border-line bg-panel/95 text-ink-3 shadow-sm hover:text-ink"
            >
              <Bug size={13} aria-hidden />
            </button>
          )}
          <div className="flex items-center gap-1.5 rounded border border-line bg-panel/95 px-2.5 py-1.5 text-[11px] text-ink-3 shadow-sm">
            <Info size={12} aria-hidden />
            {IK700_MODEL.notice.join(" · ")} · click a part to select
          </div>
        </div>
      </div>

      {debugOpen && objectNames && (
        <ModelDebugPanel
          model={model}
          selectedKey={selectedKey}
          objectNames={objectNames}
          hovered={hovered}
          health={health}
          housingMode={housingMode}
        />
      )}
    </div>
  );
}
