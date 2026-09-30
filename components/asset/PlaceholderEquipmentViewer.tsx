"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Info, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META, STATUS_ORDER, viewerColor } from "@/components/ui/status";
import type { AssetModel } from "@/lib/asset-model";
import type { Selection } from "@/lib/asset-selection";
import type { SceneZone } from "./EquipmentScene";

const EquipmentScene = dynamic(() => import("./EquipmentScene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-ink-3">Loading equipment view…</div>
  ),
});

export function PlaceholderEquipmentViewer({
  model,
  selection,
  onSelect,
}: {
  model: AssetModel;
  selection: Selection;
  onSelect: (id: string) => void;
}) {
  const [resetSignal, setResetSignal] = useState(0);

  // One clickable region per node that owns geometry, coloured by its rolled-up status.
  const zones = useMemo<SceneZone[]>(
    () =>
      Object.values(model.nodes).flatMap((n) =>
        n.zone ? [{ zone: n.zone, nodeId: n.id, label: n.name, status: n.status }] : [],
      ),
    [model.nodes],
  );

  const { node, path } = selection;
  const parent = path.length > 1 ? path[path.length - 2] : null;

  return (
    <div className="relative h-[420px] overflow-hidden rounded-md border border-line bg-[#f6f7f9] xl:h-[480px]">
      <EquipmentScene
        zones={zones}
        focus={selection.focusZones}
        context={selection.contextZones}
        onSelect={onSelect}
        resetSignal={resetSignal}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
        <div className="pointer-events-auto rounded border border-line bg-panel/95 px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            <Box size={12} aria-hidden /> {node.type === "asset" ? "Whole equipment" : `Focused ${node.type}`}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">{node.name}</span>
            <StatusBadge status={node.status} size="sm" />
          </div>
          {parent && parent.type !== "asset" && (
            <div className="mt-0.5 text-[11px] text-ink-3">within {parent.name}</div>
          )}
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
