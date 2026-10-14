"use client";

import { Pause, Play, RotateCcw, TrendingUp, Activity } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { LiveDataBadge } from "@/components/ui/LiveDataBadge";
import { useDemoMode } from "@/lib/demo-mode";
import { formatTime } from "@/lib/format";
import { isSimulated } from "@/lib/telemetry/telemetry-provider";
import type { TelemetryProvider, TelemetrySnapshot } from "@/types/telemetry";

function ControlButton({
  onClick,
  active = false,
  primary = false,
  disabled = false,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  /** The next expected action (e.g. start the stream). */
  primary?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all active:translate-y-px disabled:opacity-40 ${
        primary
          ? "bg-accent-strong px-3.5 text-white shadow-glow hover:bg-accent-hover"
          : active
            ? "bg-accent-strong text-white"
            : "text-ink-2 hover:bg-white/[0.05] hover:text-ink"
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
  const presentation = useDemoMode();

  // Demo mode: start the simulated stream automatically so charts are live on
  // arrival. Only from "idle": a stream the presenter paused stays paused.
  const autoStart = presentation && simulated !== null && snapshot.connection === "idle";
  useEffect(() => {
    if (autoStart) simulated?.start();
  }, [autoStart, simulated]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-sunken/70 px-4 py-2 lg:flex-nowrap lg:px-8">
      <div className="flex min-w-0 items-center gap-2 text-xs text-ink-3">
        <LiveDataBadge connection={snapshot.connection} />
        <span className="truncate">
          {provider.source.label} · synthetic readings every {(snapshot.intervalMs / 1000).toFixed(1)} s
          {latest && <> · last {formatTime(latest.timestamp)}</>}
        </span>
      </div>

      {simulated && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">
          <span className="hidden text-2xs font-semibold uppercase tracking-[0.1em] text-ink-3 2xl:inline">Demo controls</span>
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-sunken p-1">
            {live ? (
              <ControlButton onClick={simulated.pause}>
                <Pause size={13} aria-hidden /> Pause
              </ControlButton>
            ) : (
              <ControlButton onClick={simulated.start} primary>
                <Play size={13} aria-hidden /> {snapshot.connection === "paused" ? "Resume" : "Start live demo"}
              </ControlButton>
            )}
            {!presentation && (
              <ControlButton onClick={simulated.reset}>
                <RotateCcw size={13} aria-hidden /> Reset
              </ControlButton>
            )}
          </div>
          {!presentation && (
            <div className="flex items-center gap-0.5 rounded-lg border border-line bg-sunken p-1" role="group" aria-label="Simulation mode">
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
          )}
        </div>
      )}
    </div>
  );
}
