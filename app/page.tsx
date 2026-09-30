import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CustomerCard } from "@/components/customer/CustomerCard";
import { TopBar } from "@/components/layout/TopBar";
import { InstalledBaseSearch } from "@/components/search/InstalledBaseSearch";
import { SectionLabel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import { getCustomerSummary, getCustomers, getSearchIndex, getWatchlist } from "@/lib/installed-base";

export default async function HomePage() {
  const [index, customers, watchlist] = await Promise.all([getSearchIndex(), getCustomers(), getWatchlist()]);
  const summaries = await Promise.all(customers.map((c) => getCustomerSummary(c.id)));

  return (
    <>
      <TopBar breadcrumbs={[{ label: "Installed base" }]} />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8 lg:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Installed-Base Intelligence</h1>
        <p className="mt-2 text-ink-2">Search customer, plant, serial number, equipment or part.</p>

        <div className="mt-6">
          <InstalledBaseSearch index={index} />
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section>
            <SectionLabel>Customers</SectionLabel>
            <div className="mt-3 space-y-3">
              {customers.map((customer, i) => (
                <CustomerCard key={customer.id} customer={customer} {...summaries[i]} />
              ))}
            </div>
          </section>

          <section>
            <SectionLabel>Equipment needing review</SectionLabel>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-md border border-line bg-panel">
              {watchlist.map(({ asset, status, topConcern }) => (
                <li key={asset.id}>
                  <Link
                    href={`/assets/${asset.id}`}
                    className={`flex items-center gap-3 border-l-4 px-4 py-3 hover:bg-canvas ${STATUS_META[status].accent}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{asset.name}</div>
                      <div className="truncate text-xs text-ink-3">
                        {topConcern ? `${topConcern.condition.title} · ${topConcern.nodeName}` : asset.equipmentType}
                      </div>
                    </div>
                    <StatusBadge status={status} size="sm" />
                    <ChevronRight size={16} className="text-ink-3" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
