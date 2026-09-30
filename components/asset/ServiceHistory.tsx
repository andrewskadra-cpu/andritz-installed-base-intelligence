import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import type { ServiceEvent } from "@/types/installed-base";

const TYPE_LABEL: Record<ServiceEvent["type"], string> = {
  inspection: "Inspection",
  repair: "Repair",
  replacement: "Replacement",
  lubrication: "Lubrication",
  commissioning: "Commissioning",
};

export function ServiceHistory({
  events,
  scopeName,
  nodeName,
}: {
  events: ServiceEvent[];
  scopeName: string;
  nodeName: (id: string) => string;
}) {
  if (events.length === 0) return <EmptyState title={`No service records for ${scopeName}`} />;

  return (
    <ol className="relative space-y-3 border-l border-line pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-panel bg-navy-700" />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="font-mono text-xs tabular text-ink-3">{formatDate(e.date)}</span>
            <span className="text-sm font-semibold text-ink">{TYPE_LABEL[e.type]}</span>
            <span className="text-xs text-ink-3">{nodeName(e.targetId)}</span>
          </div>
          <p className="mt-0.5 text-sm text-ink-2">{e.summary}</p>
          <p className="mt-0.5 font-mono text-[11px] text-ink-3">
            {e.workOrder} · {e.performedBy}
          </p>
        </li>
      ))}
    </ol>
  );
}
