import type { TelemetryConnection } from "@/types/telemetry";

const STATE: Record<TelemetryConnection, { label: string; dot: string }> = {
  live: { label: "Streaming", dot: "bg-healthy" },
  paused: { label: "Paused", dot: "bg-attention" },
  idle: { label: "Not started", dot: "bg-unknown" },
};

/** Marks synthetic live telemetry. Always says DEMO so it cannot pass as measured data. */
export function LiveDataBadge({ connection }: { connection: TelemetryConnection }) {
  const state = STATE[connection];
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-info/30 bg-info-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-info">
      <span className={`size-1.5 rounded-full ${state.dot}`} aria-hidden />
      Live demo data
      <span className="font-medium normal-case tracking-normal text-info/80">· {state.label}</span>
    </span>
  );
}
