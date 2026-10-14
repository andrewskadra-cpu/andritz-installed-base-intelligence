import { STATUS_META, STATUS_ORDER } from "@/components/ui/status";
import type { HealthStatus } from "@/types/installed-base";

/** Status distribution ring with a labelled legend (counts, icons, not colour alone). */
export function HealthDonut({ summary }: { summary: Record<HealthStatus, number> }) {
  const total = STATUS_ORDER.reduce((n, s) => n + summary[s], 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  const GAP = total > 1 ? 4 : 0;
  const present = STATUS_ORDER.filter((s) => summary[s] > 0);
  const lengths = present.map((s) => (summary[s] / Math.max(total, 1)) * C);
  const segments = present.map((s, i) => ({
    status: s,
    dash: Math.max(lengths[i] - GAP, 0.001),
    offset: lengths.slice(0, i).reduce((a, b) => a + b, 0),
  }));

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="size-40 shrink-0 -rotate-90" role="img" aria-label={`Health distribution of ${total} assets`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-raised)" strokeWidth="14" />
        {segments.map((s) => (
          <circle
            key={s.status}
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={`var(--color-${s.status})`}
            strokeWidth="14"
            strokeDasharray={`${s.dash} ${C}`}
            strokeDashoffset={-s.offset}
          />
        ))}
        <g className="rotate-90" style={{ transformOrigin: "70px 70px" }}>
          <text x="70" y="68" textAnchor="middle" className="fill-ink font-mono text-[28px] font-semibold">
            {total}
          </text>
          <text x="70" y="88" textAnchor="middle" className="fill-ink-3 text-[11px] font-semibold uppercase tracking-[0.12em]">
            assets
          </text>
        </g>
      </svg>
      <ul className="min-w-40 flex-1 space-y-2.5">
        {STATUS_ORDER.filter((s) => s !== "unknown" || summary.unknown > 0).map((s) => {
          const meta = STATUS_META[s];
          const pct = total ? Math.round((summary[s] / total) * 100) : 0;
          return (
            <li key={s} className="flex items-center gap-3">
              <meta.icon size={17} className={meta.text} aria-hidden />
              <span className="flex-1 text-sm text-ink-2">{meta.label}</span>
              <span className="font-mono text-lg font-semibold tabular text-ink">{summary[s]}</span>
              <span className="w-11 text-right font-mono text-xs tabular text-ink-3">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
