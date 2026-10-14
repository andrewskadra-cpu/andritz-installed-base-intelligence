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
      className="grid size-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-white/[0.08] hover:text-ink active:translate-y-px"
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
    <div className="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-lg border border-white/10 bg-navy-900/90 p-1 shadow-raised backdrop-blur">
      <ControlButton label="Zoom out" onClick={onZoomOut}>
        <Minus size={14} aria-hidden />
      </ControlButton>
      <span className="w-14 text-center font-mono text-xs tabular text-ink" aria-live="polite">
        {zoomPercent}%
      </span>
      <ControlButton label="Zoom in" onClick={onZoomIn}>
        <Plus size={14} aria-hidden />
      </ControlButton>
      <span className="mx-1 h-5 w-px bg-white/15" />
      <ControlButton label="Fit drawing to view" onClick={onFit}>
        <Maximize size={13} aria-hidden />
      </ControlButton>
      <ControlButton label="Reset drawing view" onClick={onReset}>
        <RotateCcw size={13} aria-hidden />
      </ControlButton>
    </div>
  );
}
