import type { HealthStatus } from "@/types/installed-base";
import { STATUS_META, STATUS_ORDER } from "./status";

/** Stacked proportion bar with a labelled count per status. */
export function HealthBar({ summary }: { summary: Record<HealthStatus, number> }) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + summary[s], 0);
  const present = STATUS_ORDER.filter((s) => summary[s] > 0);

  return (
    <div>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-sm bg-canvas" aria-hidden>
        {present.map((s) => (
          <div
            key={s}
            className={STATUS_META[s].fill}
            style={{ width: `${(summary[s] / Math.max(total, 1)) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-2">
        {STATUS_ORDER.filter((s) => s !== "unknown" || summary.unknown > 0).map((s) => {
          const Icon = STATUS_META[s].icon;
          return (
            <li key={s} className="flex items-center gap-1">
              <Icon size={13} className={STATUS_META[s].text} aria-hidden />
              <span className="font-mono font-semibold tabular text-ink">{summary[s]}</span>
              {STATUS_META[s].label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
