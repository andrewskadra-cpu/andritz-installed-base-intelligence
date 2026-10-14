import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ClipboardCheck, Factory, Flame, ShieldAlert } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { BuildOutageScopeButton } from "@/components/outage/BuildOutageScopeButton";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { HealthBar } from "@/components/ui/HealthBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import { formatDate } from "@/lib/format";
import { getPortfolio, summarizeHealth } from "@/lib/installed-base";

export const metadata: Metadata = { title: "Outage Planning" };

const RANK = { critical: 0, attention: 1, unknown: 2, healthy: 3 } as const;

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000) + 1;
}

/**
 * Outage Planning hub: one entry per unit with its planned outage window (if
 * any), the condition picture of its equipment and the draft-scope action.
 * The scope itself is generated on the existing outage-scope route.
 */
export default async function OutagePlanningPage() {
  const p = await getPortfolio();

  const units = p.units.map((u) => {
    const plant = p.plants.find((pl) => pl.id === u.plantId)!;
    const assets = p.assets
      .filter((a) => a.unit.id === u.id)
      .sort((a, b) => RANK[a.summary.status] - RANK[b.summary.status]);
    const outage = p.plannedOutages.find((o) => o.unitId === u.id) ?? null;
    return { unit: u, plant, assets, outage };
  });

  return (
    <>
      <TopBar breadcrumbs={[{ label: "Outage Planning" }]} />
      <div className="page-band px-4 py-7 lg:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow text-cyan">Outage Planning</div>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Draft outage scopes</h1>
            <p className="mt-2 max-w-3xl text-base text-ink-2">
              Turn current condition indicators into draft planning suggestions per unit, traceable to asset, component,
              condition basis, engineering reference, inspection and parts to consider.
            </p>
          </div>
          <DemoBadge />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1600px] animate-enter space-y-6 px-4 py-8 lg:px-10">
        <p className="flex gap-3 rounded-xl border border-attention/30 bg-attention-soft/60 px-5 py-4 text-sm leading-relaxed text-ink-2">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-attention" aria-hidden />
          Draft scopes are planning support built on synthetic demo data. They do not authorize work. Final maintenance
          decisions require qualified engineering and technician review.
        </p>

        {units.map(({ unit, plant, assets, outage }) => {
          const health = summarizeHealth(assets.map((a) => a.summary.status));
          const conditions = assets.reduce((n, a) => n + a.conditions.length, 0);
          const lead = assets[0];
          return (
            <section key={unit.id} className="overflow-hidden rounded-2xl border border-line bg-panel shadow-panel">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-[linear-gradient(120deg,var(--color-accent-soft),var(--color-panel)_65%)] px-6 py-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-ink-3">
                    <Factory size={15} aria-hidden />
                    <Link href={`/plants/${plant.id}`} className="hover:text-accent">
                      {plant.name}
                    </Link>
                  </div>
                  <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
                    <Flame size={20} className="text-cyan" aria-hidden /> {unit.name}
                  </h2>
                  <p className="text-sm text-ink-3">{unit.unitType}</p>
                </div>
                {lead && (
                  <BuildOutageScopeButton
                    href={`/plants/${plant.id}/outage-scope?unit=${unit.id}`}
                    label={`Build Draft Outage Scope · ${unit.name}`}
                    className="px-5 py-2.5"
                  />
                )}
              </header>

              <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <div className="space-y-5">
                  <div className="rounded-xl border border-line bg-sunken/60 px-5 py-4">
                    <div className="eyebrow flex items-center gap-1.5">
                      <CalendarClock size={13} aria-hidden /> Planned outage window
                    </div>
                    {outage ? (
                      <>
                        <div className="mt-1.5 text-base font-semibold text-ink">{outage.name}</div>
                        <div className="mt-0.5 font-mono text-sm text-ink-2">
                          {formatDate(outage.plannedStart)} – {formatDate(outage.plannedEnd)} ·{" "}
                          {daysBetween(outage.plannedStart, outage.plannedEnd)} days
                        </div>
                      </>
                    ) : (
                      <p className="mt-1.5 text-sm text-ink-3">No planned outage on record for this unit.</p>
                    )}
                  </div>
                  <div>
                    <div className="eyebrow mb-2">Equipment condition</div>
                    <HealthBar summary={health} />
                    <p className="mt-3 text-sm text-ink-2">
                      <span className="font-mono text-ink">{conditions}</span> active condition{conditions === 1 ? "" : "s"} across{" "}
                      <span className="font-mono text-ink">{assets.length}</span> tracked asset{assets.length === 1 ? "" : "s"}.
                    </p>
                  </div>
                </div>

                <div>
                  <div className="eyebrow mb-2 flex items-center gap-1.5">
                    <ClipboardCheck size={13} aria-hidden /> Assets in scope
                  </div>
                  <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                    {assets.map((a) => (
                      <li key={a.summary.asset.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <span className={`h-9 w-1 rounded-full ${STATUS_META[a.summary.status].fill}`} aria-hidden />
                        <div className="min-w-0 flex-1">
                          <Link href={`/assets/${a.summary.asset.id}`} className="text-base font-semibold text-ink hover:text-accent">
                            {a.summary.asset.name}
                          </Link>
                          <div className="truncate text-xs text-ink-3">
                            {a.summary.topConcern
                              ? `${a.summary.topConcern.condition.title} · ${a.summary.topConcern.nodeName}`
                              : "No active conditions"}
                          </div>
                        </div>
                        <StatusBadge status={a.summary.status} size="sm" />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}
