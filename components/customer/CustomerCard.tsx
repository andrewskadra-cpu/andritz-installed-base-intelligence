import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { HealthBar } from "@/components/ui/HealthBar";
import type { Customer, HealthStatus } from "@/types/installed-base";

export function CustomerCard({
  customer,
  plantCount,
  assetCount,
  health,
}: {
  customer: Customer;
  plantCount: number;
  assetCount: number;
  health: Record<HealthStatus, number>;
}) {
  return (
    <Link
      href={`/customers/${customer.id}`}
      className="group block rounded-md border border-line bg-panel p-4 transition-colors hover:border-navy-700/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded bg-navy-900 text-white">
            <Building2 size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink">{customer.name}</div>
            <div className="truncate text-xs text-ink-3">
              {customer.industry} · {customer.region}
            </div>
          </div>
        </div>
        {customer.isDemo && <DemoBadge />}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.06em] text-ink-3">Plants</dt>
          <dd className="font-mono text-lg font-semibold tabular text-ink">{plantCount}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.06em] text-ink-3">Tracked assets</dt>
          <dd className="font-mono text-lg font-semibold tabular text-ink">{assetCount}</dd>
        </div>
      </dl>

      <div className="mt-3">
        <HealthBar summary={health} />
      </div>

      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-navy-700 group-hover:underline">
        Open customer <ArrowRight size={13} aria-hidden />
      </div>
    </Link>
  );
}
