"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatShortDate } from "@/lib/format";
import type { SensorChannel, SensorReading } from "@/types/installed-base";

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

function ChannelChart({ channel, readings }: { channel: SensorChannel; readings: SensorReading[] }) {
  const latest = readings.at(-1);
  const aboveBaseline = latest !== undefined && latest.value > channel.baseline;
  const { domain, ticks } = niceScale(
    readings.map((r) => r.value),
    channel.baseline,
  );

  return (
    <figure className="rounded border border-line p-3">
      <figcaption className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-ink">{channel.label}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3">
            <svg width="16" height="2" aria-hidden>
              <line x1="0" y1="1" x2="16" y2="1" stroke={AXIS_COLOR} strokeDasharray="3 2" />
            </svg>
            Demo baseline {channel.baseline} {channel.unit}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-semibold leading-none tabular text-ink">
            {latest?.value ?? "—"}
            <span className="ml-1 text-xs font-normal text-ink-3">{channel.unit}</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-ink-3">Latest</div>
        </div>
      </figcaption>

      <div className="mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={readings} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatShortDate}
              tick={{ fontSize: 10, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              minTickGap={24}
            />
            <YAxis
              domain={domain}
              ticks={ticks}
              tick={{ fontSize: 10, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <ReferenceLine y={channel.baseline} stroke={AXIS_COLOR} strokeDasharray="4 4" />
            <Tooltip
              formatter={(value) => [`${value} ${channel.unit}`, channel.label]}
              labelFormatter={(label) => formatShortDate(String(label))}
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
        {aboveBaseline ? (
          <>
            <EvidenceBadge level="detected" />
            <span className="text-ink-2">
              Latest reading above demo baseline ({channel.baseline} {channel.unit}).
            </span>
          </>
        ) : (
          <>
            <EvidenceBadge level="observed" />
            <span className="text-ink-2">
              Within demo baseline ({channel.baseline} {channel.unit}).
            </span>
          </>
        )}
      </div>
    </figure>
  );
}

function ChannelTable({ channels, readings }: { channels: SensorChannel[]; readings: SensorReading[] }) {
  const dates = [...new Set(readings.map((r) => r.timestamp))].slice(-10).reverse();
  const valueAt = (channelId: string, date: string) =>
    readings.find((r) => r.channelId === channelId && r.timestamp === date)?.value ?? "—";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-3">
            <th className="py-2 pr-4 font-medium">Date</th>
            {channels.map((c) => (
              <th key={c.id} className="py-2 pr-4 text-right font-medium">
                {c.label} ({c.unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono tabular">
          {dates.map((d) => (
            <tr key={d} className="border-b border-line last:border-0">
              <td className="py-1.5 pr-4 text-ink-2">{formatShortDate(d)}</td>
              {channels.map((c) => (
                <td key={c.id} className="py-1.5 pr-4 text-right text-ink">
                  {valueAt(c.id, d)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TelemetryPanel({
  channels,
  readings,
  scopeName,
}: {
  channels: SensorChannel[];
  readings: SensorReading[];
  scopeName: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  if (channels.length === 0) {
    return (
      <EmptyState title={`No condition channels mapped to ${scopeName}`}>
        Select the asset, gearbox or carriage to see mapped demo sensor channels.
      </EmptyState>
    );
  }

  const readingsFor = (id: string) => readings.filter((r) => r.channelId === id);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <DemoBadge label="Demo telemetry" />
          <span>
            {channels.length} channel{channels.length === 1 ? "" : "s"} for {scopeName} · synthetic data, last 30 days
          </span>
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

      {view === "chart" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {channels.map((c) => (
            <ChannelChart key={c.id} channel={c} readings={readingsFor(c.id)} />
          ))}
        </div>
      ) : (
        <ChannelTable channels={channels} readings={readings} />
      )}
    </div>
  );
}
