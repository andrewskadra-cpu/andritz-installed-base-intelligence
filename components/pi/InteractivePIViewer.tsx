"use client";

import { useEffect, useMemo, useState } from "react";
import { FileWarning, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { entityIdForKey } from "@/lib/3d/ik700-model-map";
import type { AssetModel, HierarchyNode } from "@/lib/asset-model";
import { catalogIdFor } from "@/lib/parts/catalog";
import { partsSupportHref } from "@/lib/parts/part-context";
import { entityKeysForItem } from "@/lib/pi/pi-component-map";
import { PI_FORMS, sheetOfItem } from "@/lib/pi/pi-registry";
import type { PIReference } from "@/lib/pi/pi-types";
import { PIDrawingCanvas, type SheetCallout } from "./PIDrawingCanvas";
import { PIPartDetails } from "./PIPartDetails";
import { PISheetNavigator } from "./PISheetNavigator";
import { usePIManifest } from "./usePIManifest";

/**
 * Interactive PI sheet for the selected IBIS entity.
 *
 * Selection sync without effects: the viewer's item and sheet are derived
 * from the selected entity; local choices are stored with the entity they
 * were made under and are dropped as soon as the entity changes. A callout
 * that maps to exactly one IBIS entity updates the global selection, which
 * then flows back here as the new reference - no feedback loop.
 */
export function InteractivePIViewer({
  reference,
  model,
  selectedEntityId,
  onSelectEntity,
  canvasClassName = "h-[460px] @3xl:h-[540px]",
  fill = false,
}: {
  reference: PIReference;
  model: AssetModel;
  selectedEntityId: string;
  onSelectEntity: (id: string) => void;
  /** Height of the drawing viewport when not expanded (document workspace sizes it to the screen). */
  canvasClassName?: string;
  /** Fill the parent's height: the drawing takes all space left by the header (side-by-side details scroll on their own). */
  fill?: boolean;
}) {
  const form = PI_FORMS[reference.form];
  const state = usePIManifest(reference.form);
  // Item picked in the viewer that did not change the IBIS selection.
  const [localItem, setLocalItem] = useState<{ anchor: string; item: string } | null>(null);
  // Sheet chosen manually, valid only for the item it was chosen for.
  const [sheetChoice, setSheetChoice] = useState<{ anchor: string; sheet: string } | null>(null);
  // Leaving an entity discards viewer-only choices, so returning to it starts from its reference.
  // Expanded drawing: same component, so selection sync and viewer state carry over.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);
  const [lastEntityId, setLastEntityId] = useState(selectedEntityId);
  if (lastEntityId !== selectedEntityId) {
    setLastEntityId(selectedEntityId);
    setLocalItem(null);
    // A sheet carried over by a callout click on the drawing is anchored to the new entity and kept.
    setSheetChoice((c) => (c?.anchor.startsWith(`${selectedEntityId}|`) ? c : null));
  }

  const selectedItem = localItem?.anchor === selectedEntityId ? localItem.item : reference.item;
  const sheetAnchor = `${selectedEntityId}|${selectedItem}`;

  // IBIS entities on this asset mapped to an item (more than one = ambiguous instances).
  const nodesForItem = (item: string): HierarchyNode[] =>
    entityKeysForItem(reference.form, item)
      .map((key) => model.nodes[entityIdForKey(model.rootId, key)])
      .filter((n): n is HierarchyNode => Boolean(n));

  // `onSheet`: the sheet the callout was clicked on, kept if the IBIS selection changes.
  const chooseItem = (item: string, onSheet?: string) => {
    const nodes = nodesForItem(item);
    const alreadySelected = nodes.some((n) => n.id === selectedEntityId);
    if (nodes.length === 1 && !alreadySelected) {
      if (onSheet) setSheetChoice({ anchor: `${nodes[0].id}|${item}`, sheet: onSheet });
      onSelectEntity(nodes[0].id);
      return;
    }
    // Unmapped, ambiguous or already the selected entity: viewer-only selection.
    setLocalItem({ anchor: selectedEntityId, item });
  };

  const ready = state.status === "ready" ? state : null;
  const manifest = ready?.manifest;

  // Warm the browser cache with every sheet once the manifest is in, so sheet switching is immediate.
  useEffect(() => {
    if (!ready) return;
    for (const s of ready.manifest.sheets) new Image().src = `${ready.baseUrl}${s.image}`;
  }, [ready]);
  const activeSheetId = manifest
    ? (sheetChoice?.anchor === sheetAnchor ? sheetChoice.sheet : null) ??
      sheetOfItem(manifest, selectedItem) ??
      manifest.sheets[0]?.id
    : null;
  const activeSheet = manifest?.sheets.find((s) => s.id === activeSheetId) ?? null;

  const callouts = useMemo<SheetCallout[]>(() => {
    if (!manifest || !activeSheetId) return [];
    return manifest.items.flatMap((it) =>
      it.callouts
        .filter((c) => c.sheet === activeSheetId)
        .map((c) => ({
          item: it.item,
          callout: c,
          mapped: entityKeysForItem(reference.form, it.item).length > 0,
          label: `Item ${it.item}${it.name ? ` · ${it.name}` : ""}`,
        })),
    );
  }, [manifest, activeSheetId, reference.form]);

  const refLabel = `${form?.label ?? `PI ${reference.form}`}${reference.item ? ` · Item ${reference.item}` : ""}`;

  if (!form || state.status === "unavailable") {
    return (
      <div className="grid min-h-[260px] place-items-center rounded border border-dashed border-line bg-raised px-6 py-10 text-center">
        <div>
          <FileWarning size={22} className="mx-auto text-ink-3" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-ink">Engineering drawing available</p>
          <p className="mt-0.5 font-mono text-sm text-ink-2">{refLabel}</p>
          <p className="mt-2 text-xs text-ink-3">Interactive drawing asset not available in this environment.</p>
        </div>
      </div>
    );
  }

  if (!manifest || !activeSheet) {
    return (
      <div className="grid min-h-[260px] place-items-center text-xs text-ink-3">
        <p className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" aria-hidden />
          Loading {refLabel}…
        </p>
      </div>
    );
  }

  const item = selectedItem ? manifest.items.find((i) => i.item === selectedItem) ?? null : null;
  const itemSheetId = sheetOfItem(manifest, selectedItem);
  const itemSheetLabel = manifest.sheets.find((s) => s.id === itemSheetId)?.label ?? null;

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-50 flex animate-fade flex-col bg-canvas p-4 shadow-2xl lg:p-6"
          : fill
            ? "@container flex min-h-0 flex-1 flex-col"
            : "@container"
      }
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded || undefined}
      aria-label={expanded ? `${form.label} drawing` : undefined}
    >
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div className="mr-auto min-w-0">
          <p className="truncate text-base font-semibold text-ink" title={`${form.label} · ${manifest.title ?? form.title}`}>
            {form.label} <span className="font-normal text-ink-2">· {manifest.title ?? form.title}</span>
          </p>
          <p className="text-xs text-ink-3">
            {form.equipmentModels.join(", ")} · {form.assembly}
          </p>
        </div>
        <PISheetNavigator
          sheets={manifest.sheets}
          activeSheetId={activeSheet.id}
          onSheet={(sheet) => setSheetChoice({ anchor: sheetAnchor, sheet })}
          items={manifest.items}
          onSearchSelect={chooseItem}
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-pressed={expanded}
          className="btn-secondary h-9 px-3 text-xs"
        >
          {expanded ? <Minimize2 size={13} aria-hidden /> : <Maximize2 size={13} aria-hidden />}
          <span className={expanded ? "" : "sr-only @2xl:not-sr-only"}>{expanded ? "Exit expanded view" : "Expand drawing"}</span>
        </button>
      </div>

      <div
        className={
          expanded
            ? "grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px] gap-4"
            : fill
              ? "grid min-h-0 flex-1 grid-rows-[minmax(320px,100%)_auto] gap-4 @3xl:grid-cols-[minmax(0,1fr)_300px] @3xl:grid-rows-1"
              : "grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_300px]"
        }
      >
        <div className={expanded ? "min-h-0" : fill ? "min-h-0" : canvasClassName}>
          <PIDrawingCanvas
            sheet={activeSheet}
            imageUrl={`${ready!.baseUrl}${activeSheet.image}`}
            callouts={callouts}
            selectedItem={selectedItem}
            onSelectItem={(item) => chooseItem(item, activeSheet.id)}
          />
        </div>
        <div className={`rounded-lg border border-line bg-sunken/60 p-4 ${expanded ? "overflow-y-auto" : fill ? "@3xl:min-h-0 @3xl:overflow-y-auto" : ""}`}>
          <PIPartDetails
            formLabel={form.label}
            sheetLabel={
              item
                ? manifest.sheets
                    .filter((s) => item.callouts.some((c) => c.sheet === s.id))
                    .map((s) => s.label.split(" · ")[0])
                    .join(", ") || null
                : null
            }
            itemNumber={selectedItem}
            item={item}
            mappedNodes={selectedItem ? nodesForItem(selectedItem) : []}
            selectedEntityId={selectedEntityId}
            onSelectEntity={onSelectEntity}
            catalogHref={
              // Only named PI positions are catalog parts (same manifest, so the mapping is exact).
              item?.name
                ? partsSupportHref(`/parts/${catalogIdFor(reference.form, item.item)}`, {
                    assetId: model.rootId,
                    entityId: selectedEntityId === model.rootId ? null : selectedEntityId,
                  })
                : null
            }
          />
          {selectedItem && itemSheetId && itemSheetId !== activeSheet.id && (
            <button
              type="button"
              onClick={() => setSheetChoice(null)}
              className="mt-3 w-full rounded-lg border border-accent/40 px-2 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent-soft"
            >
              Show item {selectedItem} on {itemSheetLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
