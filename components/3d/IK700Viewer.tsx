"use client";

import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Box, Bug, Info, Moon, RotateCcw, Sun } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META, STATUS_ORDER } from "@/components/ui/status";
import {
  ASSET_KEY,
  CLICK_TARGETS,
  ENTITY_MODEL_MAP,
  IK700_MODEL,
  entityIdForKey,
  entityKey,
} from "@/lib/3d/ik700-model-map";
import { defaultHousingMode, deriveHealthSurfaces, type HousingMode } from "@/lib/3d/model-visual-state";
import { priorityArea, type AssetModel } from "@/lib/asset-model";
import { useDemoMode } from "@/lib/demo-mode";
import { setStageTheme, useStageTheme } from "@/lib/3d/stage-preference";
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
  compact = false,
}: {
  model: AssetModel;
  selection: Selection;
  onSelect: (id: string | null) => void;
  fallback: ReactNode;
  /** Small contextual preview (Documents Focus): overlays reduced to essentials. */
  compact?: boolean;
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
  const stage = useStageTheme();
  const dark = stage === "dark";
  const calloutRef = useRef<HTMLDivElement>(null);
  const calloutCardRef = useRef<HTMLButtonElement>(null);
  const hoverLabelRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  // Mapping debug: always available in development, via ?debug3d=1 otherwise.
  const presentation = useDemoMode();
  const debugAllowed =
    !presentation && (process.env.NODE_ENV !== "production" || searchParams.get("debug3d") === "1");

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

  // Whole-machine view: pin a callout on the highest-priority area, which is small at this scale.
  const area = priorityArea(model);
  const areaMapping = area && area.status !== "healthy" && area.status !== "unknown" ? ENTITY_MODEL_MAP[entityKey(assetId, area.id)] : undefined;
  const calloutObjects = mapping.view === "asset" && areaMapping ? (areaMapping.frame ?? areaMapping.objects) : null;

  const housingMode =
    housingOverride?.key === selectedKey ? housingOverride.mode : defaultHousingMode(mapping);

  const onPick = useCallback(
    (key: string) => onSelect(key === ASSET_KEY ? null : entityIdForKey(assetId, key)),
    [assetId, onSelect],
  );
  const onCalloutFrame = useCallback((x: number, y: number, inView: boolean) => {
    const el = calloutRef.current;
    if (!el) return;
    el.style.opacity = inView ? "1" : "0";
    el.style.transform = `translate(${x}px, ${y}px)`;
    // Keep the label inside the viewer; the pin and leader stay on the anchor.
    const card = calloutCardRef.current;
    const width = el.parentElement?.clientWidth ?? 0;
    if (card && width) {
      const half = card.offsetWidth / 2;
      const shift = Math.max(0, 12 + half - x) - Math.max(0, x + half + 12 - width);
      card.style.translate = `calc(-50% + ${shift}px) 0`;
    }
  }, []);
  const onLoaded = useCallback((names: string[]) => setObjectNames(new Set(names)), []);

  if (availability === "unavailable" || loadFailed) {
    return (
      <div className="relative h-full">
        {fallback}
        <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-navy-900/90 px-3 py-1.5 text-2xs text-ink-2 shadow-raised">
          Local IK-700 model not available · showing placeholder geometry
        </div>
      </div>
    );
  }

  const { node, path } = selection;
  const parent = path.length > 1 ? path[path.length - 2] : null;

  // Floating hover label: the entity a click would select (same resolution as picking).
  const hoverKey = hovered ? CLICK_TARGETS[hovered] : undefined;
  const hoverNode = hoverKey ? model.nodes[entityIdForKey(assetId, hoverKey)] : undefined;
  const showHover = hoverNode && hoverNode.id !== node.id ? hoverNode : null;

  return (
    <div
      className={`@container relative h-full min-h-[180px] overflow-hidden rounded-lg border shadow-raised ring-1 ring-black/40 ${
        dark ? "twin-stage border-accent/15" : "border-white/10 bg-[#f4f6f9]"
      }`}
    >
      {dark && <div aria-hidden className="twin-glow absolute inset-0" />}
      {dark && <div aria-hidden className="twin-vignette absolute inset-0 z-[1]" />}
      {/* Pointer tracking for the hover label: direct style writes, no re-render per move. */}
      <div
        className="absolute inset-0"
        onPointerMoveCapture={(e) => {
          const el = hoverLabelRef.current;
          if (!el) return;
          const r = e.currentTarget.getBoundingClientRect();
          el.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 16}px)`;
        }}
      >
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
            calloutObjects={calloutObjects}
            onCalloutFrame={onCalloutFrame}
            theme={stage}
            calloutTone={area && (area.status === "critical" || area.status === "attention") ? area.status : null}
          />
        </ModelErrorBoundary>
      )}
      </div>
      {!objectNames && <ModelLoadingState checking={availability === "checking"} />}

      <div
        ref={hoverLabelRef}
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 z-[6] transition-opacity duration-150 ${showHover ? "opacity-100" : "opacity-0"}`}
      >
        {showHover && (
          <div className="flex items-center gap-2 whitespace-nowrap rounded-md border border-white/10 bg-navy-900/90 px-2.5 py-1.5 text-xs shadow-raised backdrop-blur">
            <span className={`size-2 rounded-full ${STATUS_META[showHover.status].fill}`} />
            <span className="font-semibold text-ink">{showHover.name}</span>
            <span className="text-ink-3">· {STATUS_META[showHover.status].label}</span>
            <span className="ml-1 text-2xs text-accent">Click to select</span>
          </div>
        )}
      </div>

      {/* Priority-area callout, positioned every frame by the scene. Only the label is clickable. */}
      {!compact && calloutObjects && area && objectNames && (
        <div
          ref={calloutRef}
          className="pointer-events-none absolute left-0 top-0 z-[5] opacity-0 transition-opacity duration-300"
        >
          {/* Anchor: solid core, fixed reticle ring, slow soft pulse */}
          <span className={`absolute -left-[5px] -top-[5px] size-2.5 rounded-full ring-2 ring-white/90 ${STATUS_META[area.status].fill}`} />
          <span className={`absolute -left-[12px] -top-[12px] size-6 rounded-full border ${area.status === "critical" ? "border-critical/80" : "border-attention/80"}`} />
          <span className={`absolute -left-[12px] -top-[12px] size-6 rounded-full border opacity-50 motion-safe:animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite] ${area.status === "critical" ? "border-critical" : "border-attention"}`} />
          {/* Leader: fades from the card into the anchor */}
          <span className={`absolute bottom-3 left-0 h-[60px] w-px bg-gradient-to-t from-transparent ${area.status === "critical" ? "to-critical" : "to-attention"}`} />
          <button
            ref={calloutCardRef}
            type="button"
            onClick={() => onSelect(area.id)}
            className={`group pointer-events-auto absolute bottom-[72px] left-0 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 border-t-2 bg-navy-900/92 py-2 pl-3 pr-3.5 text-left shadow-raised backdrop-blur transition-colors hover:bg-navy-800 ${area.status === "critical" ? "border-t-critical" : "border-t-attention"}`}
          >
            <span className={`flex items-center gap-1.5 font-mono text-2xs font-semibold uppercase tracking-[0.1em] ${area.status === "critical" ? "text-critical" : "text-attention"}`}>
              {(() => {
                const Icon = STATUS_META[area.status].icon;
                return <Icon size={12} strokeWidth={2.4} aria-hidden />;
              })()}
              {STATUS_META[area.status].label} · priority area
            </span>
            <span className="mt-0.5 block text-sm font-semibold text-ink">{area.name}</span>
            <span className="block text-2xs text-ink-3 transition-colors group-hover:text-accent">Select to inspect →</span>
          </button>
        </div>
      )}

      {/* Context card + controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-2 p-3">
        <div className={`pointer-events-auto rounded-lg ${compact ? "hidden" : ""}`}>
        <div className="rounded-lg border border-white/10 bg-navy-900/90 px-3.5 py-2.5 shadow-raised backdrop-blur">
          <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3">
            <Box size={12} aria-hidden />
            {mapping.view === "asset" ? "Whole equipment" : `${mapping.view} view`}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="max-w-[34cqw] truncate whitespace-nowrap text-base font-semibold text-ink" title={node.name}>{node.name}</span>
            <StatusBadge status={node.status} size="sm" />
          </div>
          {parent && parent.type !== "asset" && <div className="mt-0.5 text-2xs text-ink-3">within {parent.name}</div>}
          {mapping.confidence !== "direct" && mapping.note && (
            <div className="mt-1 max-w-64 text-2xs leading-snug text-ink-3">{mapping.note}</div>
          )}
        </div>
        </div>
        <div className="pointer-events-auto ml-auto flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setHousingOverride(null);
              setResetToken((n) => n + 1);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-navy-900/90 px-3 py-1.5 text-xs font-medium text-ink-2 shadow-raised backdrop-blur transition-colors hover:bg-navy-800 hover:text-ink active:translate-y-px"
          >
            <RotateCcw size={13} aria-hidden /> <span className={compact ? "sr-only" : "sr-only @2xl:not-sr-only"}>Reset view</span>
          </button>
          {!compact && (
          <button
            type="button"
            onClick={() => setStageTheme(dark ? "engineering" : "dark")}
            aria-pressed={!dark}
            title={dark ? "Switch to the light engineering background" : "Switch to the dark digital-twin stage"}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-navy-900/90 px-3 py-1.5 text-xs font-medium text-ink-2 shadow-raised backdrop-blur transition-colors hover:bg-navy-800 hover:text-ink active:translate-y-px"
          >
            {dark ? <Sun size={13} aria-hidden /> : <Moon size={13} aria-hidden />}
            <span className="sr-only @2xl:not-sr-only">{dark ? "Engineering view" : "Digital-twin view"}</span>
          </button>
          )}
          </div>
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-navy-900/90 p-1 text-2xs shadow-raised backdrop-blur" role="group" aria-label="Carriage housing">
            <span className={`px-1.5 font-medium uppercase tracking-[0.08em] text-ink-3 ${compact ? "sr-only" : "sr-only @2xl:not-sr-only"}`}>Housing</span>
            {HOUSING_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                aria-pressed={housingMode === mode}
                onClick={() => setHousingOverride({ key: selectedKey, mode })}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${housingMode === mode ? "bg-accent-strong text-white shadow-sm" : "text-ink-2 hover:bg-white/[0.06] hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend + prototype notice */}
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex-wrap items-end justify-between gap-2 p-3 ${compact ? "hidden" : "flex"}`}>
        <ul className="flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-lg border border-white/10 bg-navy-900/90 px-3 py-2 text-2xs font-medium text-ink-2 shadow-raised backdrop-blur">
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
              className="pointer-events-auto grid size-8 place-items-center rounded-lg border border-white/10 bg-navy-900/90 text-ink-3 shadow-raised backdrop-blur hover:text-ink"
            >
              <Bug size={13} aria-hidden />
            </button>
          )}
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-navy-900/90 px-3 py-2 text-2xs text-ink-2 shadow-raised backdrop-blur">
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
