import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatNumber } from "@/lib/format";
import type { AssetModel } from "@/lib/asset-model";
import type { ServiceEvent } from "@/types/installed-base";

const TYPE_LABEL: Record<ServiceEvent["type"], string> = {
  inspection: "Inspection",
  repair: "Repair",
  replacement: "Replacement",
  lubrication: "Lubrication",
  commissioning: "Commissioning",
};

const LEVEL_LABEL = { asset: "Asset", assembly: "Assembly", component: "Component" } as const;

export function ServiceHistory({
  events,
  model,
  scopeName,
}: {
  events: ServiceEvent[];
  model: AssetModel;
  scopeName: string;
}) {
  if (events.length === 0) return <EmptyState title={`No service records for ${scopeName}`} />;

  return (
    <div>
      <p className="mb-3 text-xs text-ink-3">
        {events.length} synthetic demo record{events.length === 1 ? "" : "s"} for {scopeName} and its subcomponents,
        newest first.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-3">
              <th className="py-2 pr-4 font-medium">Date</th>
              <th className="py-2 pr-4 font-medium">Level</th>
              <th className="py-2 pr-4 font-medium">Event</th>
              <th className="py-2 pr-4 font-medium">Description</th>
              <th className="py-2 pr-4 font-medium">Source</th>
              <th className="py-2 text-right font-medium">Asset hrs</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const node = model.nodes[e.entityId];
              return (
                <tr key={e.id} className="border-b border-line align-top last:border-0">
                  <td className="whitespace-nowrap py-2 pr-4 font-mono text-xs tabular text-ink-2">{formatDate(e.date)}</td>
                  <td className="py-2 pr-4">
                    <div className="text-[11px] uppercase tracking-wide text-ink-3">{node ? LEVEL_LABEL[node.type] : ""}</div>
                    <div className="whitespace-nowrap text-ink">{node?.name}</div>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4 font-medium text-ink">{TYPE_LABEL[e.type]}</td>
                  <td className="min-w-48 py-2 pr-4 text-ink-2">{e.description}</td>
                  <td className="py-2 pr-4 text-xs text-ink-3">
                    <div>{e.performedBy}</div>
                    <div className="font-mono">{e.workOrder}</div>
                  </td>
                  <td className="py-2 text-right font-mono text-xs tabular text-ink-2">
                    {formatNumber(e.assetOperatingHours)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
