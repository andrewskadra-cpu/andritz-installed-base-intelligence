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
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.1em] text-cyan">
      <span className={`size-2 rounded-full ${state.dot}`} aria-hidden />
      Live demo data
      <span className="font-medium normal-case tracking-normal text-ink-2">· {state.label}</span>
    </span>
  );
}
