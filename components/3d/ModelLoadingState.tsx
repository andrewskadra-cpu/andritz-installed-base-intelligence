"use client";

import { useProgress } from "@react-three/drei";
import { Box } from "lucide-react";

/** Overlay shown until the IK-700 model has loaded and been indexed. */
export function ModelLoadingState({ checking = false }: { checking?: boolean }) {
  const { progress } = useProgress();
  const pct = checking ? 0 : Math.round(progress);
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-[#f4f6f9]">
      <div className="w-64 text-center">
        <Box size={22} className="mx-auto text-ink-3" aria-hidden />
        <p className="mt-2 text-sm font-medium text-ink-2">Loading IK-700 visualization…</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-navy-700 transition-[width]" style={{ width: `${Math.max(pct, 4)}%` }} />
        </div>
        <p className="mt-1.5 font-mono text-[11px] text-ink-3">{checking ? "Checking local model…" : `${pct}%`}</p>
      </div>
    </div>
  );
}
