"use client";

import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatTime } from "@/lib/format";
import { TELEMETRY_SIGNALS } from "@/lib/telemetry/signals";
import type { TelemetryFrame, TelemetrySignalKey } from "@/types/telemetry";

export interface TrendSeries {
  assetId: string;
  name: string;
  frames: TelemetryFrame[];
}

/** Series colours: neutral data hues, never the health colours. */
const SERIES = ["var(--color-cyan)", "var(--color-accent)", "var(--color-violet)"];
const SIGNALS: TelemetrySignalKey[] = ["vibration", "gearbox_temperature", "motor_current", "travel_time"];
const TICK = { fontSize: 12, fill: "var(--color-ink-3)", fontFamily: "var(--font-mono)" };

/**
 * Recent simulated telemetry per tracked asset, exactly the frames the health
 * engine assessed for each asset page. Samples are aligned by position
 * (same simulator interval); nothing is resampled or extrapolated.
 */
export function PortfolioTrends({ series }: { series: TrendSeries[] }) {
  const [signal, setSignal] = useState<TelemetrySignalKey>("vibration");
  const def = TELEMETRY_SIGNALS[signal];
  const length = Math.max(...series.map((s) => s.frames.length), 0);
  const reference = series.find((s) => s.frames.length === length)?.frames ?? [];
  const data = Array.from({ length }, (_, i) => {
    const row: Record<string, number | string> = { t: reference[i]?.timestamp ?? "" };
    for (const s of series) {
      const f = s.frames[s.frames.length - length + i];
      if (f) row[s.assetId] = f[signal];
    }
    return row;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-line bg-sunken p-1" role="group" aria-label="Signal">
        {SIGNALS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={signal === k}
            onClick={() => setSignal(k)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              signal === k ? "bg-accent-strong text-white shadow-sm" : "text-ink-2 hover:bg-white/[0.05] hover:text-ink"
            }`}
          >
            {TELEMETRY_SIGNALS[k].label}
          </button>
        ))}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-line)" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="t" tickFormatter={(v) => (v ? formatTime(String(v)) : "")} tick={TICK} tickLine={false} axisLine={{ stroke: "var(--color-line)" }} minTickGap={48} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} width={52} domain={["auto", "auto"]} unit="" />
            <ReferenceLine
              y={def.baseline}
              stroke="var(--color-ink-2)"
              strokeOpacity={0.6}
              strokeDasharray="4 4"
              label={{ value: `Demo baseline ${def.baseline} ${def.unit}`, position: "insideTopLeft", fill: "var(--color-ink-3)", fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, key) => [`${Number(value).toFixed(def.decimals)} ${def.unit}`, series.find((s) => s.assetId === key)?.name ?? key]}
              labelFormatter={(label) => (label ? formatTime(String(label)) : "")}
              contentStyle={{
                fontSize: 13,
                borderRadius: 8,
                background: "var(--color-raised)",
                borderColor: "var(--color-line-strong)",
                color: "var(--color-ink)",
              }}
              labelStyle={{ color: "var(--color-ink-3)", fontFamily: "var(--font-mono)" }}
            />
            <Legend
              formatter={(key) => <span className="text-xs text-ink-2">{series.find((s) => s.assetId === key)?.name ?? key}</span>}
              iconType="plainline"
            />
            {series.map((s, i) => (
              <Line key={s.assetId} type="monotone" dataKey={s.assetId} stroke={SERIES[i % SERIES.length]} strokeWidth={2.25} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-ink-3">
        {def.label} ({def.unit}) · simulated demo telemetry, the same recent window each asset page assesses. Not measured sensor data.
      </p>
    </div>
  );
}
