import type { HealthStatus } from "@/types/installed-base";
import { STATUS_META, STATUS_ORDER } from "@/components/ui/status";

/** Row of status count tiles for a plant's tracked equipment. */
export function PlantHealthSummary({
  summary,
  conditionCount,
}: {
  summary: Record<HealthStatus, number>;
  conditionCount: number;
}) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + summary[s], 0);
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <div className="rounded-md border border-line bg-panel px-4 py-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">Tracked assets</div>
        <div className="mt-1 font-mono text-2xl font-semibold tabular text-ink">{total}</div>
      </div>
      {STATUS_ORDER.filter((s) => s !== "unknown").map((s) => {
        const meta = STATUS_META[s];
        const Icon = meta.icon;
        return (
          <div key={s} className={`rounded-md border border-l-4 border-line bg-panel px-4 py-3 ${meta.accent}`}>
            <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">
              <Icon size={13} className={meta.text} aria-hidden />
              {meta.label}
            </div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular text-ink">{summary[s]}</div>
          </div>
        );
      })}
      <div className="rounded-md border border-line bg-panel px-4 py-3">
        <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">Active conditions</div>
        <div className="mt-1 font-mono text-2xl font-semibold tabular text-ink">{conditionCount}</div>
      </div>
    </div>
  );
}
