import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, Cog } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import { formatDate, formatNumber } from "@/lib/format";
import type { AssetSummary } from "@/lib/installed-base";

/** Equipment cards for a plant unit. Status is carried by accent, badge and tint. */
export function AssetList({ assets }: { assets: AssetSummary[] }) {
  return (
    <ul className="space-y-2">
      {assets.map(({ asset, status, cycles, lastService, topConcern }) => {
        const meta = STATUS_META[status];
        return (
          <li key={asset.id}>
            <Link
              href={`/assets/${asset.id}`}
              className={`group block rounded-md border border-l-4 border-line bg-panel px-4 py-3 transition-shadow hover:shadow-md ${meta.accent}`}
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 md:grid-cols-[auto_minmax(0,1.5fr)_repeat(3,minmax(0,1fr))_auto]">
                <span className={`grid size-10 place-items-center rounded border ${meta.soft}`}>
                  <Cog size={20} aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-ink">{asset.name}</span>
                    <StatusBadge status={status} size="sm" />
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink-3">
                    S/N <span className="font-mono">{asset.serialNumber}</span> · {asset.equipmentType} ·{" "}
                    {asset.installedPosition}
                  </div>
                </div>
                <Metric label="Operating hours" value={formatNumber(asset.operatingHours)} />
                <Metric label="Cycles" value={formatNumber(cycles)} />
                <Metric label="Last service" value={formatDate(lastService)} />
                <ChevronRight size={18} className="text-ink-3 group-hover:text-ink" aria-hidden />
              </div>
              <div className="mt-2 border-t border-line pt-2 text-xs md:ml-14">
                <span className="font-medium uppercase tracking-wide text-ink-3">Top concern: </span>
                {topConcern ? (
                  <span className={`font-medium ${STATUS_META[topConcern.condition.status].text}`}>
                    {topConcern.condition.title}
                    <span className="font-normal text-ink-3"> · {topConcern.nodeName}</span>
                  </span>
                ) : (
                  <span className="text-ink-2">None · all monitored signals within demo limits</span>
                )}
              </div>
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
