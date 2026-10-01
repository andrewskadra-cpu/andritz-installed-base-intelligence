"use client";

import { Maximize, Minus, Plus, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={onClick}
      className="grid size-7 place-items-center rounded text-ink-2 hover:bg-canvas hover:text-ink"
    >
      {children}
    </button>
  );
}

/** Zoom / fit / reset controls overlaid on the drawing viewport. */
export function PIControls({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
}: {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded border border-line bg-panel/95 p-0.5 shadow-sm">
      <ControlButton label="Zoom out" onClick={onZoomOut}>
        <Minus size={14} aria-hidden />
      </ControlButton>
      <span className="w-12 text-center font-mono text-[11px] tabular text-ink-2" aria-live="polite">
        {zoomPercent}%
      </span>
      <ControlButton label="Zoom in" onClick={onZoomIn}>
        <Plus size={14} aria-hidden />
      </ControlButton>
      <span className="mx-0.5 h-4 w-px bg-line" />
      <ControlButton label="Fit drawing to view" onClick={onFit}>
        <Maximize size={13} aria-hidden />
      </ControlButton>
      <ControlButton label="Reset drawing view" onClick={onReset}>
        <RotateCcw size={13} aria-hidden />
      </ControlButton>
    </div>
  );
}
