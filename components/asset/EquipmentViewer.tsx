"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Info, RotateCcw } from "lucide-react";
import { STATUS_META, STATUS_ORDER, viewerColor } from "@/components/ui/status";
import type { SelectedNode } from "@/lib/asset-selection";
import type { Assembly, Component, ViewerZone } from "@/types/installed-base";
import type { SceneZone } from "./EquipmentScene";

const EquipmentScene = dynamic(() => import("./EquipmentScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-ink-3">Loading equipment view…</div>
  ),
});

export function EquipmentViewer({
  assemblies,
  components,
  selection,
  onSelect,
}: {
  assemblies: Assembly[];
  components: Component[];
  selection: SelectedNode;
  onSelect: (nodeId: string) => void;
}) {
  const [resetSignal, setResetSignal] = useState(0);

  // One clickable zone per assembly, plus components that have their own zone.
  const zones = useMemo<SceneZone[]>(() => {
    const result: SceneZone[] = assemblies.map((a) => ({
      zone: a.viewerZone,
      nodeId: a.id,
      label: a.name,
      status: a.status,
    }));
    for (const c of components) {
      if (!result.some((z) => z.zone === c.viewerZone)) {
        result.push({ zone: c.viewerZone, nodeId: c.id, label: c.name, status: c.status });
      }
    }
    return result;
  }, [assemblies, components]);

  const focus = useMemo<Set<ViewerZone> | null>(() => {
    if (selection.level === "asset" || !selection.zone) return null;
    const set = new Set<ViewerZone>([selection.zone]);
    if (selection.level === "assembly") {
      for (const c of components) {
        if (c.assemblyId === selection.id) set.add(c.viewerZone);
      }
    }
    return set;
  }, [selection, components]);

  return (
    <div className="relative h-[420px] overflow-hidden rounded-md border border-line bg-[#f6f7f9] xl:h-[480px]">
      <EquipmentScene zones={zones} focus={focus} onSelect={onSelect} resetSignal={resetSignal} />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
        <div className="pointer-events-auto rounded border border-line bg-panel/95 px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            <Box size={12} aria-hidden /> Equipment view
          </div>
          <div className="text-sm font-semibold text-ink">{selection.name}</div>
        </div>
        <button
          type="button"
          onClick={() => setResetSignal((n) => n + 1)}
          className="pointer-events-auto flex items-center gap-1.5 rounded border border-line bg-panel/95 px-2.5 py-1.5 text-xs font-medium text-ink-2 shadow-sm hover:text-ink"
        >
          <RotateCcw size={13} aria-hidden /> Reset view
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-3">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 rounded border border-line bg-panel/95 px-3 py-1.5 text-[11px] text-ink-2 shadow-sm">
          {STATUS_ORDER.map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: viewerColor(s) }} />
              {STATUS_META[s].label}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1.5 rounded border border-line bg-panel/95 px-2.5 py-1.5 text-[11px] text-ink-3 shadow-sm">
          <Info size={12} aria-hidden />
          Placeholder geometry · not to scale · click an area to drill down
        </div>
      </div>
    </div>
  );
}
