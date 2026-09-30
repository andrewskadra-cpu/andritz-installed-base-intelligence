"use client";

import { Pause, Play, RotateCcw, TrendingUp, Activity } from "lucide-react";
import type { ReactNode } from "react";
import { LiveDataBadge } from "@/components/ui/LiveDataBadge";
import { formatTime } from "@/lib/format";
import { isSimulated } from "@/lib/telemetry/telemetry-provider";
import type { TelemetryProvider, TelemetrySnapshot } from "@/types/telemetry";

function ControlButton({
  onClick,
  active = false,
  disabled = false,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
        active ? "bg-navy-900 text-white" : "text-ink-2 hover:bg-canvas hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Stream status plus prototype-only simulator controls. */
export function LiveDemoControls({
  provider,
  snapshot,
}: {
  provider: TelemetryProvider;
  snapshot: TelemetrySnapshot;
}) {
  const latest = snapshot.frames.at(-1);
  const live = snapshot.connection === "live";
  const simulated = isSimulated(provider) ? provider : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-panel px-4 py-2 lg:px-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <LiveDataBadge connection={snapshot.connection} />
        <span>
          {provider.source.label} · synthetic readings every {(snapshot.intervalMs / 1000).toFixed(1)} s
          {latest && <> · last {formatTime(latest.timestamp)}</>}
        </span>
      </div>

      {simulated && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-3">Demo controls</span>
          <div className="flex items-center gap-0.5 rounded border border-line p-0.5">
            {live ? (
              <ControlButton onClick={simulated.pause}>
                <Pause size={13} aria-hidden /> Pause
              </ControlButton>
            ) : (
              <ControlButton onClick={simulated.start}>
                <Play size={13} aria-hidden /> {snapshot.connection === "paused" ? "Resume" : "Start live demo"}
              </ControlButton>
            )}
            <ControlButton onClick={simulated.reset}>
              <RotateCcw size={13} aria-hidden /> Reset
            </ControlButton>
          </div>
          <div className="flex items-center gap-0.5 rounded border border-line p-0.5" role="group" aria-label="Simulation mode">
            <ControlButton
              onClick={() => simulated.setMode("normal")}
              active={snapshot.simulationMode === "normal"}
            >
              <Activity size={13} aria-hidden /> Normal mode
            </ControlButton>
            <ControlButton
              onClick={() => simulated.setMode("degrading")}
              active={snapshot.simulationMode === "degrading"}
            >
              <TrendingUp size={13} aria-hidden /> Simulate degradation
            </ControlButton>
          </div>
        </div>
      )}
    </div>
  );
}
