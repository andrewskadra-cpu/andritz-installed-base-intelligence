import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Cog } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import { formatDate, formatNumber } from "@/lib/format";
import type { Asset } from "@/types/installed-base";

/** Equipment rows for a plant unit. Status is carried by accent, badge and tint. */
export function AssetList({
  assets,
  conditionCounts,
}: {
  assets: Asset[];
  conditionCounts: Record<string, number>;
}) {
  return (
    <ul className="space-y-2">
      {assets.map((asset) => {
        const meta = STATUS_META[asset.status];
        const conditions = conditionCounts[asset.id] ?? 0;
        return (
          <li key={asset.id}>
            <Link
              href={`/assets/${asset.id}`}
              className={`group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-md border border-l-4 border-line bg-panel px-4 py-3 transition-shadow hover:shadow-md md:grid-cols-[auto_minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto] ${meta.accent}`}
            >
              <span className={`grid size-10 place-items-center rounded border ${meta.soft}`}>
                <Cog size={20} aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold text-ink">{asset.name}</span>
                  <StatusBadge status={asset.status} size="sm" />
                </div>
                <div className="mt-0.5 truncate text-xs text-ink-3">
                  {asset.equipmentType} · {asset.installedPosition}
                </div>
              </div>
              <Metric label="Operating hours" value={formatNumber(asset.operatingHours)} />
              <Metric label="Cycles" value={formatNumber(asset.cycles)} />
              <Metric label="Last service" value={formatDate(asset.lastService)} />
              <Metric
                label="Active conditions"
                value={
                  <span className={conditions > 0 ? meta.text : "text-ink-3"}>{conditions}</span>
                }
              />
              <ChevronRight size={18} className="text-ink-3 group-hover:text-ink" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="hidden min-w-0 md:block">
      <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-ink-3">{label}</div>
      <div className="truncate font-mono text-sm font-medium tabular text-ink">{value}</div>
    </div>
  );
}
