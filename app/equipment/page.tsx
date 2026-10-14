import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Box, Columns2, FileText } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Sparkline } from "@/components/overview/Sparkline";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import { formatDate, formatNumber } from "@/lib/format";
import { getPortfolio } from "@/lib/installed-base";
import { SIGNAL_ORDER, TELEMETRY_SIGNALS } from "@/lib/telemetry/signals";

export const metadata: Metadata = { title: "Equipment Intelligence" };

const RANK = { critical: 0, attention: 1, unknown: 2, healthy: 3 } as const;

/**
 * Equipment Intelligence: every tracked asset with its derived health, the
 * latest simulated readings and direct entry into each workspace mode.
 */
export default async function EquipmentPage() {
  const p = await getPortfolio();
  const assets = [...p.assets].sort(
    (a, b) => RANK[a.summary.status] - RANK[b.summary.status] || b.summary.conditionCount - a.summary.conditionCount,
  );

  return (
    <>
      <TopBar breadcrumbs={[{ label: "Equipment Intelligence" }]} />
      <div className="page-band px-4 py-7 lg:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow text-cyan">Equipment Intelligence</div>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Digital-twin workspaces</h1>
            <p className="mt-2 max-w-3xl text-base text-ink-2">
              Tracked equipment ranked by condition. Open a workspace in 3D, split with engineering drawings, or documents first.
            </p>
          </div>
          <DemoBadge label="Demo data · simulated telemetry" />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1600px] animate-enter space-y-5 px-4 py-8 lg:px-10">
        {assets.map(({ summary, plant, unit, conditions, recentTelemetry }) => {
          const latest = recentTelemetry.at(-1);
          const href = `/assets/${summary.asset.id}`;
          return (
            <article
              key={summary.asset.id}
              className={`overflow-hidden rounded-2xl border border-l-4 border-line bg-panel shadow-panel ${STATUS_META[summary.status].accent}`}
            >
              <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight text-ink">
                      <Link href={href} className="hover:text-accent">
                        {summary.asset.name}
                      </Link>
                    </h2>
                    <StatusBadge status={summary.status} />
                  </div>
                  <p className="mt-1.5 text-sm text-ink-2">
                    {summary.asset.equipmentType} · <span className="font-mono">{summary.asset.model}</span> · s/n{" "}
                    <span className="font-mono">{summary.asset.serialNumber}</span>
                  </p>
                  <p className="text-sm text-ink-3">
                    {plant.name} · {unit.name} · {summary.asset.installedPosition}
                  </p>

                  <div className="mt-4 rounded-xl border border-line bg-sunken/60 px-4 py-3">
                    <div className="eyebrow">
                      {conditions.length} active condition{conditions.length === 1 ? "" : "s"}
                    </div>
                    {conditions.length === 0 ? (
                      <p className="mt-1 text-sm text-ink-2">All monitored signals within demo limits.</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {conditions.slice(0, 3).map((c) => (
                          <li key={c.id}>
                            <Link href={`${href}?entity=${c.entityId}`} className="flex items-center gap-2 text-sm hover:text-accent">
                              <span className={`size-2 shrink-0 rounded-full ${STATUS_META[c.status].fill}`} aria-hidden />
                              <span className="text-ink">{c.title}</span>
                              <span className="text-ink-3">· {c.nodeName}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={href} className="btn-primary px-4 py-2 text-sm">
                      <Box size={16} aria-hidden /> Open 3D workspace
                    </Link>
                    <Link href={`${href}?view=split`} className="btn-secondary px-4 py-2 text-sm">
                      <Columns2 size={16} aria-hidden /> Split view
                    </Link>
                    <Link href={`${href}?view=docs`} className="btn-secondary px-4 py-2 text-sm">
                      <FileText size={16} aria-hidden /> Documents
                    </Link>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="eyebrow">Latest simulated readings</div>
                    <span className="text-xs text-ink-3">
                      Cycles <span className="font-mono text-ink-2">{formatNumber(summary.cycles)}</span> · last service{" "}
                      <span className="font-mono text-ink-2">{formatDate(summary.lastService)}</span>
                    </span>
                  </div>
                  {latest ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {SIGNAL_ORDER.map((k) => {
                        const def = TELEMETRY_SIGNALS[k];
                        return (
                          <div key={k} className="rounded-xl border border-line bg-sunken/60 px-4 py-3">
                            <div className="text-xs font-medium text-ink-3">{def.label}</div>
                            <div className="mt-1 flex items-end justify-between gap-3">
                              <div className="font-mono text-2xl font-semibold tabular text-ink">
                                {latest[k].toFixed(def.decimals)}
                                <span className="ml-1 text-sm font-normal text-ink-3">{def.unit}</span>
                              </div>
                              <Sparkline values={recentTelemetry.map((f) => f[k])} baseline={def.baseline} className="h-10 w-32" />
                            </div>
                            <div className="mt-1 text-2xs text-ink-3">
                              Demo baseline {def.baseline} {def.unit}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-ink-3">No telemetry source configured for this asset.</p>
                  )}
                </div>
              </div>
              <Link
                href={href}
                className="group flex items-center justify-between border-t border-line bg-sunken/50 px-6 py-3 text-sm text-ink-2 transition-colors hover:text-ink"
              >
                Simulated demo telemetry, assessed by the demo health engine. Not measured sensor data.
                <ArrowRight size={16} className="text-accent transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </article>
          );
        })}
      </main>
    </>
  );
}
