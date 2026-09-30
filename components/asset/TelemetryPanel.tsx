"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { LiveDataBadge } from "@/components/ui/LiveDataBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber, formatTime } from "@/lib/format";
import { TELEMETRY_SIGNALS } from "@/lib/telemetry/signals";
import type { HealthStatus, SensorReading } from "@/types/installed-base";
import type {
  HealthAssessment,
  SignalAssessment,
  TelemetryConnection,
  TelemetryFrame,
  TelemetrySignalKey,
} from "@/types/telemetry";

const SERIES_COLOR = "#1f3860";
const AXIS_COLOR = "#6b778c";
const GRID_COLOR = "#e6e9ef";

/** Y-axis domain and ticks on a 1/2/5 step that always include the baseline. */
function niceScale(values: number[], baseline: number) {
  const min = Math.min(...values, baseline);
  const max = Math.max(...values, baseline);
  const raw = (max - min) / 4 || 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 5, 10].find((m) => m * magnitude >= raw) ?? 10) * magnitude;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Number(t.toFixed(6)));
  return { domain: [lo, hi] as [number, number], ticks };
}

function ChannelChart({
  signal,
  frames,
  assessment,
}: {
  signal: TelemetrySignalKey;
  frames: TelemetryFrame[];
  assessment: SignalAssessment;
}) {
  const def = TELEMETRY_SIGNALS[signal];
  const data = useMemo<SensorReading[]>(
    () => frames.map((f) => ({ signal, timestamp: f.timestamp, value: f[signal] })),
    [frames, signal],
  );
  const { domain, ticks } = niceScale(
    data.map((d) => d.value),
    def.baseline,
  );

  return (
    <figure className="rounded border border-line p-3">
      <figcaption className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-ink">{def.label}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3">
            <svg width="16" height="2" aria-hidden>
              <line x1="0" y1="1" x2="16" y2="1" stroke={AXIS_COLOR} strokeDasharray="3 2" />
            </svg>
            Demo baseline {def.baseline} {def.unit}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-semibold leading-none tabular text-ink">
            {assessment.latest.toFixed(def.decimals)}
            <span className="ml-1 text-xs font-normal text-ink-3">{def.unit}</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-ink-3">Latest</div>
        </div>
      </figcaption>

      <div className="mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              tick={{ fontSize: 10, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              minTickGap={40}
            />
            <YAxis
              domain={domain}
              ticks={ticks}
              tick={{ fontSize: 10, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <ReferenceLine y={def.baseline} stroke={AXIS_COLOR} strokeDasharray="4 4" />
            <Tooltip
              formatter={(value) => [`${value} ${def.unit}`, def.label]}
              labelFormatter={(label) => formatTime(String(label))}
              contentStyle={{ fontSize: 12, borderRadius: 4, borderColor: "#dde2ea" }}
              cursor={{ stroke: AXIS_COLOR, strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={SERIES_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-line pt-2 text-xs">
        {assessment.detection ? (
          <>
            <EvidenceBadge level="detected" />
            <span className="text-ink-2">{assessment.detection}.</span>
          </>
        ) : (
          <>
            <EvidenceBadge level="observed" />
            <span className="text-ink-2">Within demo limits.</span>
          </>
        )}
      </div>
    </figure>
  );
}

function ChannelTable({ signals, frames }: { signals: TelemetrySignalKey[]; frames: TelemetryFrame[] }) {
  const rows = frames.slice(-12).reverse();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-3">
            <th className="py-2 pr-4 font-medium">Time (UTC)</th>
            <th className="py-2 pr-4 text-right font-medium">Cycle</th>
            {signals.map((k) => (
              <th key={k} className="py-2 pr-4 text-right font-medium">
                {TELEMETRY_SIGNALS[k].label} ({TELEMETRY_SIGNALS[k].unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono tabular">
          {rows.map((f) => (
            <tr key={f.timestamp} className="border-b border-line last:border-0">
              <td className="py-1.5 pr-4 text-ink-2">{formatTime(f.timestamp)}</td>
              <td className="py-1.5 pr-4 text-right text-ink-2">{formatNumber(f.cycleCount)}</td>
              {signals.map((k) => (
                <td key={k} className="py-1.5 pr-4 text-right text-ink">
                  {f[k].toFixed(TELEMETRY_SIGNALS[k].decimals)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Health-engine result for the selected scope: status, detections and counters. */
function HealthEngineStrip({
  assessment,
  frames,
  signals,
  scopeName,
  scopeStatus,
}: {
  assessment: HealthAssessment;
  frames: TelemetryFrame[];
  signals: TelemetrySignalKey[];
  scopeName: string;
  scopeStatus: HealthStatus;
}) {
  const reasons = signals.flatMap((k) => (assessment.signals[k].detection ? [assessment.signals[k].detection!] : []));
  return (
    <div className="mb-4 grid gap-3 rounded border border-line bg-canvas/60 p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Telemetry context · {scopeName}
          </span>
          <StatusBadge status={scopeStatus} size="sm" />
        </div>
        {signals.length === 0 ? (
          <p className="mt-1.5 text-sm text-ink-2">No monitored signals for this level.</p>
        ) : reasons.length === 0 ? (
          <p className="mt-1.5 text-sm text-ink-2">
            {signals.length} signal{signals.length === 1 ? "" : "s"} within demo limits.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-0.5 text-sm text-ink-2">
            {reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <EvidenceBadge level="detected" />
                <span className="min-w-0">{r}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 self-start text-right sm:grid-cols-1">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-ink-3">Cycle count</dt>
          <dd className="font-mono text-lg font-semibold tabular text-ink">
            {formatNumber(assessment.latest.cycleCount)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-ink-3">Last reading (UTC)</dt>
          <dd className="font-mono text-sm tabular text-ink-2">
            {formatTime(assessment.latest.timestamp)} · {frames.length} samples
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function TelemetryPanel({
  signals,
  frames,
  assessment,
  connection,
  scopeName,
  scopeStatus,
}: {
  signals: TelemetrySignalKey[];
  frames: TelemetryFrame[];
  assessment: HealthAssessment | null;
  connection: TelemetryConnection;
  scopeName: string;
  scopeStatus: HealthStatus;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  if (!assessment) {
    return <EmptyState title="No telemetry available">No telemetry source is configured for this asset.</EmptyState>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <LiveDataBadge connection={connection} />
          <span>Synthetic readings from the telemetry simulator · not measured sensor data</span>
        </div>
        <div className="flex rounded border border-line p-0.5 text-xs">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-sm px-2.5 py-1 font-medium capitalize ${
                view === v ? "bg-navy-900 text-white" : "text-ink-2 hover:text-ink"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <HealthEngineStrip
        assessment={assessment}
        frames={frames}
        signals={signals}
        scopeName={scopeName}
        scopeStatus={scopeStatus}
      />

      {signals.length === 0 ? (
        <EmptyState title={`No condition monitoring on ${scopeName}`}>
          Demo telemetry covers the gearbox, its bearing and the carriage drive. Select one of those, or the whole
          asset, to see live signals.
        </EmptyState>
      ) : view === "chart" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {signals.map((k) => (
            <ChannelChart key={k} signal={k} frames={frames} assessment={assessment.signals[k]} />
          ))}
        </div>
      ) : (
        <ChannelTable signals={signals} frames={frames} />
      )}
    </div>
  );
}
