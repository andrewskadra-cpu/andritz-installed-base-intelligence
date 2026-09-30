import { KeyValue } from "@/components/ui/KeyValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import { formatDate, formatNumber } from "@/lib/format";
import type { SelectedNode } from "@/lib/asset-selection";

/** Health state and operating counters for the selected hierarchy node. */
export function HealthSummary({ selection }: { selection: SelectedNode }) {
  const { record } = selection;
  const meta = STATUS_META[record.status];
  return (
    <div className={`border-l-4 px-4 py-4 ${meta.accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {selection.subtitle}
          </div>
          <div className="truncate text-base font-semibold text-ink">{selection.name}</div>
        </div>
        <StatusBadge status={record.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <KeyValue label="Operating hours" value={formatNumber(record.operatingHours)} mono />
        <KeyValue label="Cycles" value={formatNumber(record.cycles)} mono />
        <KeyValue label="Last service" value={formatDate(record.lastService)} mono />
        <KeyValue label="Last replacement" value={formatDate(record.lastReplacement)} mono />
      </dl>
    </div>
  );
}
