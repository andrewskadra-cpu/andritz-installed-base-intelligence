"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, BookOpen, Box, Columns2, FileText, History, ListTree, Package, type LucideIcon } from "lucide-react";
import { outageScopeHref } from "@/components/outage/BuildOutageScopeButton";
import { TopBar } from "@/components/layout/TopBar";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Tabs } from "@/components/ui/Tabs";
import { entityKey } from "@/lib/3d/ik700-model-map";
import { buildAssetModel } from "@/lib/asset-model";
import { piReferenceFor } from "@/lib/pi/pi-component-map";
import { PI_FORMS } from "@/lib/pi/pi-registry";
import {
  resolveSelection,
  scopeConditions,
  scopeDocuments,
  scopeParts,
  scopeRecommendations,
  scopeServiceEvents,
  scopeSignals,
} from "@/lib/asset-selection";
import { useAssetTelemetry } from "@/lib/telemetry/use-telemetry";
import { useBooleanPreference } from "@/lib/ui-preferences";
import type { AssetRecords } from "@/types/installed-base";
import type { TelemetryFrame } from "@/types/telemetry";
import { AssetHeader } from "./AssetHeader";
import { DocumentWorkspace } from "./DocumentWorkspace";
import { EquipmentHierarchy } from "./EquipmentHierarchy";
import { EquipmentViewer } from "./EquipmentViewer";
import { IntelligencePanel } from "./IntelligencePanel";
import { LiveDemoControls } from "./LiveDemoControls";
import { PartsPanel } from "./PartsPanel";
import { ServiceHistory } from "./ServiceHistory";
import { TelemetryPanel } from "./TelemetryPanel";

/** Query parameter holding the selected hierarchy entity. */
export const ENTITY_PARAM = "entity";
/** Query parameter holding the workspace mode (3D Focus is the default). */
export const VIEW_PARAM = "view";

export type WorkspaceMode = "3d" | "split" | "docs";

const MODES: { id: WorkspaceMode; label: string; icon: LucideIcon; hint: string }[] = [
  { id: "3d", label: "3D Focus", icon: Box, hint: "Large 3D model with intelligence alongside" },
  { id: "split", label: "Split View", icon: Columns2, hint: "3D model and engineering drawing side by side" },
  { id: "docs", label: "Documents", icon: FileText, hint: "Large drawing with a compact 3D preview" },
];

/*
 * Workspace "stage": the first grid row is exactly the viewport height left
 * below the page chrome at load (--stage-top is measured, see below), so the
 * working surfaces end at the fold. Supporting content (condition data,
 * history, parts) follows below it and the page scrolls naturally.
 *
 * Every region keeps the same element (keyed) in the same place in the React
 * tree, so changing mode only re-flows the CSS grid: the 3D scene and the PI
 * viewer are never remounted by a mode switch. No region spans an auto-sized
 * row, so a tall panel can never stretch a row and leave blank space beside it.
 */
const STAGE_VARS =
  "[--stage-h:max(440px,calc(100dvh-var(--stage-top,17rem)-1.5rem))] [--preview-h:clamp(200px,calc(var(--stage-h)*0.42),340px)]";

const GRID: Record<WorkspaceMode, string> = {
  "3d":
    "[grid-template-areas:'viewer'_'intel'_'tabs'] xl:grid-cols-[minmax(0,1fr)_380px] xl:grid-rows-[var(--stage-h)_auto] xl:[grid-template-areas:'viewer_intel'_'tabs_tabs'] 2xl:grid-cols-[minmax(0,1fr)_420px]",
  split:
    "[grid-template-areas:'viewer'_'docs'_'intel'_'tabs'] xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:grid-rows-[var(--stage-h)_auto] xl:[grid-template-areas:'viewer_docs'_'intel_tabs'] 2xl:grid-cols-2",
  docs:
    "[grid-template-areas:'docs'_'viewer'_'intel'_'tabs'] xl:grid-cols-[minmax(0,1fr)_380px] xl:grid-rows-[var(--preview-h)_calc(var(--stage-h)-var(--preview-h)-1.25rem)_auto] xl:[grid-template-areas:'docs_viewer'_'docs_intel'_'tabs_tabs'] 2xl:grid-cols-[minmax(0,1fr)_420px]",
};

/* Stacked (below xl) the surfaces take the stage height; side by side they fill their grid track. */
const VIEWER_HEIGHT: Record<WorkspaceMode, string> = {
  "3d": "h-[var(--stage-h)] xl:h-auto",
  split: "h-[var(--stage-h)] xl:h-auto",
  docs: "h-[300px] xl:h-auto",
};
const DOCS_HEIGHT = "h-[max(var(--stage-h),560px)] xl:h-auto";
/* Intelligence fills its track with one internal scroll; in Split View it sits below the stage, capped at its height. */
const INTEL_HEIGHT: Record<WorkspaceMode, string> = {
  "3d": "min-h-0",
  split: "min-h-0 max-h-[var(--stage-h)]",
  docs: "min-h-0",
};

const WIDE = "(min-width: 1536px)";
const DESKTOP = "(min-width: 1280px)";
const subscribeMedia = (cb: () => void) => {
  const queries = [WIDE, DESKTOP].map((q) => window.matchMedia(q));
  queries.forEach((mq) => mq.addEventListener("change", cb));
  return () => queries.forEach((mq) => mq.removeEventListener("change", cb));
};

function ModeSwitcher({ mode, onChange }: { mode: WorkspaceMode; onChange: (m: WorkspaceMode) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl border border-line bg-sunken p-1" role="group" aria-label="Workspace mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={mode === m.id}
          title={m.hint}
          onClick={() => onChange(m.id)}
          className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
            mode === m.id ? "bg-accent-strong text-white shadow-glow" : "text-ink-2 hover:bg-white/[0.05] hover:text-ink"
          }`}
        >
          <m.icon size={16} aria-hidden />
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

function Region({ area, className = "", children }: { area: string; className?: string; children: ReactNode }) {
  return <div className={`min-w-0 ${className}`} style={{ gridArea: area }}>{children}</div>;
}

/**
 * Equipment intelligence workspace. The ONLY selection state is the
 * `?entity=` query parameter and the only layout state is `?view=`; every
 * panel derives its content from the same model + selection.
 */
export function AssetWorkspace({
  records,
  recentTelemetry,
}: {
  records: AssetRecords;
  recentTelemetry: TelemetryFrame[];
}) {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get(ENTITY_PARAM);
  const viewParam = searchParams.get(VIEW_PARAM);
  // Legacy ?tab=pi links (e.g. "Open in Interactive PI" from Part Details) open the drawing alongside the model.
  const mode: WorkspaceMode =
    viewParam === "split" || viewParam === "docs" || viewParam === "3d" ? viewParam : searchParams.get("tab") === "pi" ? "split" : "3d";

  const telemetry = useAssetTelemetry(
    { assetId: records.asset.id, cycleCount: records.asset.recordedCycles },
    recentTelemetry,
  );
  const model = useMemo(() => buildAssetModel(records, telemetry.assessment), [records, telemetry.assessment]);
  const selection = useMemo(() => resolveSelection(model, selectedId), [model, selectedId]);

  // Bottom tabs keep their choice while the selection changes, so context carries across components.
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState(() => (initialTab && ["condition", "service", "parts"].includes(initialTab) ? initialTab : "condition"));
  const tabsRef = useRef<HTMLDivElement>(null);
  const docsRef = useRef<HTMLDivElement>(null);

  // Equipment tree: a column on wide screens (remembered), an overlay drawer otherwise.
  const wide = useSyncExternalStore(subscribeMedia, () => window.matchMedia(WIDE).matches, () => false);
  const desktop = useSyncExternalStore(subscribeMedia, () => window.matchMedia(DESKTOP).matches, () => false);

  // Measure where the stage starts (document offset, so scrolling does not change it) and the
  // sticky toolbar's bottom edge. Written straight to CSS variables: layout only, no re-render.
  const stageRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const stage = stageRef.current;
    const toolbar = toolbarRef.current;
    if (!stage || !toolbar) return;
    const measure = () => {
      stage.style.setProperty("--stage-top", `${Math.round(stage.getBoundingClientRect().top + window.scrollY)}px`);
      stage.style.setProperty("--ws-top", `${64 + Math.round(toolbar.getBoundingClientRect().height)}px`); // toolbar sticks at top-16
    };
    measure();
    // Header, demo controls or toolbar re-wrapping moves the stage.
    const ro = new ResizeObserver(measure);
    for (let el = stage.previousElementSibling; el; el = el.previousElementSibling) ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const [treePinned, setTreePinned] = useBooleanPreference("ibis-tree-open", true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const treeOpen = wide ? treePinned : drawerOpen;
  const setTreeOpen = (open: boolean) => (wide ? setTreePinned(open) : setDrawerOpen(open));

  const setParam = useCallback((key: string, value: string | null, push: boolean) => {
    // Only this parameter changes; unrelated parameters (e.g. debug3d) are kept.
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === VIEW_PARAM) params.delete("tab");
    const query = params.toString();
    const url = query ? `?${query}` : window.location.pathname;
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);

  const select = useCallback((id: string | null) => setParam(ENTITY_PARAM, id, true), [setParam]);
  const setMode = useCallback((m: WorkspaceMode) => setParam(VIEW_PARAM, m === "3d" ? null : m, false), [setParam]);

  const openDrawing = useCallback(() => {
    if (mode === "3d") setMode("split");
    requestAnimationFrame(() => docsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }, [mode, setMode]);
  const openServiceHistory = useCallback(() => {
    setTab("service");
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const { plant, unit } = records;
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Equipment Intelligence", href: "/equipment" },
    { label: `${plant.name} · ${unit.name}`, href: `/installed-base?unit=${unit.id}` },
    ...selection.path.map((node) => ({
      label: node.name,
      onClick: () => select(node.type === "asset" ? null : node.id),
    })),
  ];

  const scopeName = selection.node.name;
  const drawings = scopeDocuments(model, selection, ["drawing", "procedure"]);
  const piSheets = scopeDocuments(model, selection, ["pi_sheet"]);
  // Only exact component mappings select a PI item (no inheritance from parents).
  const piReference = piReferenceFor(entityKey(model.rootId, selection.node.id));
  const piForm = piReference ? PI_FORMS[piReference.form] : null;
  const engineeringReference =
    piReference && piForm
      ? { label: piReference.item ? `${piForm.label} · Item ${piReference.item}` : piForm.label, title: piForm.title }
      : null;
  const bom = scopeParts(model, selection);
  // Only cite a BOM document filed against the node that owns the BOM lines shown.
  const bomOwnerId = bom.inheritedFrom?.id ?? selection.node.id;
  const bomDocument = model.records.documents.find((d) => d.kind === "bom" && d.entityId === bomOwnerId) ?? null;
  // Nodes without their own monitoring show their parent's telemetry, labelled as such.
  const telemetryScope = selection.monitoredVia
    ? { name: `${scopeName} (via ${selection.monitoredVia.name})`, status: selection.monitoredVia.status }
    : { name: scopeName, status: selection.node.status };

  // On laptop widths the tree is an overlay: picking a component closes it so the workspace is visible again.
  const selectFromTree = (id: string | null) => {
    select(id);
    if (!wide) setDrawerOpen(false);
  };
  const tree = (
    <EquipmentHierarchy model={model} selection={selection} onSelect={selectFromTree} onClose={() => setTreeOpen(false)} />
  );

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <AssetHeader model={model} />
      {telemetry.provider && <LiveDemoControls provider={telemetry.provider} snapshot={telemetry.snapshot} />}

      {/* Workspace toolbar: tree, selection, engineering reference, mode */}
      <div
        ref={toolbarRef}
        className="sticky top-16 z-[15] flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 py-2 backdrop-blur-xl lg:flex-nowrap lg:px-8"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 lg:flex-nowrap">
          <button
            type="button"
            onClick={() => setTreeOpen(!treeOpen)}
            aria-pressed={treeOpen}
            aria-label={treeOpen ? "Hide equipment tree" : "Show equipment tree"}
            className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              treeOpen ? "border-accent/50 bg-accent-soft text-ink" : "border-line-strong bg-raised text-ink-2 hover:text-ink"
            }`}
          >
            <ListTree size={16} aria-hidden /> <span className="hidden lg:inline">Equipment tree</span>
          </button>
          <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-line bg-panel px-3 py-1.5" data-testid="selected-entity">
            <span className="hidden text-xs font-medium uppercase tracking-[0.08em] text-ink-3 2xl:inline">Selected</span>
            <span className="max-w-[22rem] truncate text-sm font-semibold text-ink" title={scopeName}>{scopeName}</span>
            <StatusBadge status={selection.node.status} size="sm" />
          </div>
          {engineeringReference && (
            <button
              type="button"
              onClick={openDrawing}
              className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-line-strong bg-raised px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:border-accent/50 hover:text-ink"
              title="Open the engineering drawing for the selected component"
            >
              <BookOpen size={16} className="text-info" aria-hidden />
              <span className="font-mono">{engineeringReference.label}</span>
            </button>
          )}
        </div>
        <ModeSwitcher mode={mode} onChange={setMode} />
      </div>

      <div ref={stageRef} className={`relative flex items-start gap-5 p-4 lg:px-8 lg:pb-8 lg:pt-4 ${STAGE_VARS}`}>
        {/* Equipment tree: column (wide) or overlay drawer (laptop). */}
        {treeOpen &&
          (wide ? (
            <aside className="sticky top-[calc(var(--ws-top,8rem)+1rem)] h-[var(--stage-h)] w-[320px] shrink-0 animate-fade">{tree}</aside>
          ) : (
            <div className="pointer-events-none absolute bottom-0 left-4 top-4 z-20 w-[min(340px,calc(100%-2rem))] lg:left-8">
              <aside
                className="pointer-events-auto sticky top-[calc(var(--ws-top,8rem)+1rem)] h-[var(--stage-h)] animate-enter drop-shadow-2xl"
                onKeyDown={(e) => e.key === "Escape" && setDrawerOpen(false)}
              >
                {tree}
              </aside>
            </div>
          ))}

        <main className={`grid min-w-0 flex-1 gap-5 ${GRID[mode]}`}>
          <Region key="viewer" area="viewer" className={VIEWER_HEIGHT[mode]}>
            <EquipmentViewer model={model} selection={selection} onSelect={select} compact={mode === "docs"} />
          </Region>

          {mode !== "3d" && (
            <Region key="docs" area="docs" className={mode === "docs" ? DOCS_HEIGHT : VIEWER_HEIGHT.split}>
              <div ref={docsRef} className="h-full scroll-mt-36">
                <DocumentWorkspace
                  model={model}
                  selection={selection}
                  onSelect={select}
                  piReference={piReference}
                  drawings={drawings}
                  piSheets={piSheets}
                  bom={bom.items}
                />
              </div>
            </Region>
          )}

          <Region key="intel" area="intel" className={desktop ? INTEL_HEIGHT[mode] : ""}>
            <IntelligencePanel
              fill={desktop}
              model={model}
              selection={selection}
              conditions={scopeConditions(model, selection)}
              recommendations={scopeRecommendations(model, selection)}
              onSelect={select}
              engineeringReference={engineeringReference}
              onOpenEngineeringReference={openDrawing}
              onOpenServiceHistory={openServiceHistory}
              outageHref={outageScopeHref(plant.id, unit.id, records.asset.id)}
            />
          </Region>

          <Region key="tabs" area="tabs" className="self-start">
            <div ref={tabsRef} className="scroll-mt-40 overflow-hidden rounded-xl border border-line bg-panel shadow-panel">
              <Tabs
                active={tab}
                onChange={setTab}
                items={[
                  {
                    id: "condition",
                    label: "Condition Data",
                    icon: Activity,
                    content: (
                      <TelemetryPanel
                        signals={scopeSignals(selection)}
                        frames={telemetry.snapshot.frames}
                        assessment={telemetry.assessment}
                        connection={telemetry.snapshot.connection}
                        scopeName={telemetryScope.name}
                        scopeStatus={telemetryScope.status}
                      />
                    ),
                  },
                  {
                    id: "service",
                    label: "Service History",
                    icon: History,
                    content: <ServiceHistory events={scopeServiceEvents(model, selection)} model={model} scopeName={scopeName} />,
                  },
                  {
                    id: "parts",
                    label: "Parts",
                    icon: Package,
                    content: (
                      <PartsPanel
                        parts={bom.items}
                        inheritedFrom={bom.inheritedFrom}
                        bomDocument={bomDocument}
                        model={model}
                        scopeName={scopeName}
                        onSelect={select}
                      />
                    ),
                  },
                ]}
              />
              {mode === "3d" && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sunken/60 px-5 py-3 text-sm text-ink-2">
                  <span className="flex items-center gap-2">
                    <FileText size={16} className="text-ink-3" aria-hidden />
                    Drawings, procedures and the Interactive PI open in the document workspace.
                  </span>
                  <button type="button" onClick={() => setMode("split")} className="btn-secondary px-3 py-1.5 text-xs">
                    <Columns2 size={14} aria-hidden /> Open Split View
                  </button>
                </div>
              )}
            </div>
          </Region>
        </main>
      </div>
    </>
  );
}
