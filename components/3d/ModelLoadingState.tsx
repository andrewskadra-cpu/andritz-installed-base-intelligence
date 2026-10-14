"use client";

import { useProgress } from "@react-three/drei";
import { Box } from "lucide-react";

/** Overlay shown until the IK-700 model has loaded and been indexed. */
export function ModelLoadingState({ checking = false }: { checking?: boolean }) {
  const { progress } = useProgress();
  const pct = checking ? 0 : Math.round(progress);
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-[radial-gradient(ellipse_at_center,var(--color-raised)_0%,var(--color-canvas)_75%)]">
      <div className="w-72 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-accent/30 bg-accent-soft text-accent shadow-glow">
          <Box size={22} className="motion-safe:animate-pulse" aria-hidden />
        </span>
        <p className="mt-4 text-sm font-semibold text-ink">Loading IK-700 visualization…</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan to-accent transition-[width] duration-300"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
        <p className="mt-2 font-mono text-2xs text-ink-3">{checking ? "Checking local model…" : `${pct}%`}</p>
      </div>
    </div>
  );
}
