import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Headset,
  History,
  Network,
  OctagonAlert,
  PackageSearch,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import { DemoModeButton } from "@/components/layout/DemoModeButton";
import { TopBar } from "@/components/layout/TopBar";
import { HealthDonut } from "@/components/overview/HealthDonut";
import { PortfolioTrends } from "@/components/overview/PortfolioTrends";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import { formatDate } from "@/lib/format";
import { getPortfolio } from "@/lib/installed-base";
import type { HealthStatus } from "@/types/installed-base";

export const metadata: Metadata = { title: "Overview" };

function Section({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-panel shadow-panel ${className}`}>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-6 py-4">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        </div>
        {action}
      </header>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Kpi({ label, value, status, hint }: { label: string; value: number; status?: HealthStatus; hint: string }) {
  const meta = status ? STATUS_META[status] : null;
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-panel px-6 py-5 shadow-panel ${meta ? `border-l-4 ${meta.accent}` : ""}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-3">
        {meta && <meta.icon size={15} className={meta.text} aria-hidden />}
        {label}
      </div>
      <div className="mt-2 font-mono text-5xl font-semibold leading-none tabular text-ink">{value}</div>
      <div className="mt-3 text-xs text-ink-3">{hint}</div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, title, text }: { href: string; icon: LucideIcon; title: string; text: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3.5 rounded-xl border border-line bg-panel px-5 py-4 shadow-panel transition-all hover:-translate-y-0.5 hover:border-accent/50 hover:bg-raised/60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent-soft text-accent">
        <Icon size={19} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          {title}
          <ArrowRight size={14} className="text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">{text}</span>
      </span>
    </Link>
  );
}

export default async function OverviewPage() {
  const p = await getPortfolio();
  const assets = p.assets;
  const ranked = [...assets].sort(
    (a, b) =>
      ["critical", "attention", "unknown", "healthy"].indexOf(a.summary.status) -
        ["critical", "attention", "unknown", "healthy"].indexOf(b.summary.status) ||
      b.summary.conditionCount - a.summary.conditionCount,
  );
  const review = ranked.filter((a) => a.summary.status !== "healthy");
  const conditions = assets
    .flatMap((a) => a.conditions.map((c) => ({ ...c, asset: a })))
    .sort((x, y) => ["critical", "attention", "unknown", "healthy"].indexOf(x.status) - ["critical", "attention", "unknown", "healthy"].indexOf(y.status));
  const topCritical = ranked.find((a) => a.summary.status === "critical") ?? ranked[0];
  const plantCount = new Set(assets.map((a) => a.plant.id)).size;
  const customerCount = new Set(assets.map((a) => a.customer.id)).size;

  return (
    <>
      <TopBar breadcrumbs={[{ label: "Overview" }]} />
      <main className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-8 lg:px-10 lg:py-10">
        {/* ── Hero ── */}
        <div className="relative animate-enter overflow-hidden rounded-2xl border border-line bg-[radial-gradient(900px_300px_at_85%_-40%,rgb(56_139_255/0.22),transparent_70%),linear-gradient(135deg,var(--color-panel),var(--color-canvas))] px-8 py-8 shadow-raised">
          <div
            aria-hidden
            className="absolute inset-0 opacity-40 [mask-image:linear-gradient(90deg,transparent,#000_60%)]"
            style={{
              backgroundImage:
                "linear-gradient(rgb(56 139 255 / 0.08) 1px, transparent 1px), linear-gradient(90deg, rgb(56 139 255 / 0.08) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="eyebrow flex items-center gap-2 text-cyan">
                <span className="h-px w-6 bg-cyan/60" aria-hidden /> ANDRITZ · IBIS
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">IBIS Command Center</h1>
              <p className="mt-3 text-base leading-relaxed text-ink-2">
                Monitoring <strong className="text-ink">{assets.length} tracked assets</strong> across {plantCount} plant
                {plantCount === 1 ? "" : "s"} for {customerCount} customer{customerCount === 1 ? "" : "s"} in the demo installed
                base. Health is derived from simulated demo telemetry and recorded service history.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <DemoBadge label="Demo data · simulated telemetry" />
              <Suspense fallback={null}>
                <DemoModeButton />
              </Suspense>
            </div>
          </div>
        </div>

        {/* ── Primary metrics ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Tracked demo assets" value={assets.length} hint={`${p.units.length} unit${p.units.length === 1 ? "" : "s"} · ${plantCount} plant${plantCount === 1 ? "" : "s"}`} />
          <Kpi label="Critical" value={p.health.critical} status="critical" hint="Simulated condition beyond demo critical limit" />
          <Kpi label="Attention" value={p.health.attention} status="attention" hint="Deviation from demo baseline" />
          <Kpi label="Healthy" value={p.health.healthy} status="healthy" hint="All monitored signals within demo limits" />
        </div>

        {/* ── Quick actions ── */}
        <nav aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <QuickAction href="/installed-base" icon={Network} title="Explore Installed Base" text="Customers, plants, units and equipment." />
          <QuickAction
            href={topCritical ? `/assets/${topCritical.summary.asset.id}` : "/equipment"}
            icon={OctagonAlert}
            title="Inspect Critical Equipment"
            text={topCritical ? `${topCritical.summary.asset.name} · ${topCritical.summary.topConcern?.nodeName ?? "asset"}` : "Equipment intelligence"}
          />
          <QuickAction href="/parts-support/parts" icon={PackageSearch} title="Browse Parts" text="Documented IK-700 parts for a quote inquiry." />
          <QuickAction
            href="/outage-planning"
            icon={ClipboardList}
            title="Draft Outage Scope"
            text={p.plannedOutages[0]?.name ?? "Outage planning suggestions for review."}
          />
          <QuickAction href="/parts-support/contact" icon={Headset} title="Contact Support" text="Technical, service or parts questions." />
        </nav>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* ── Priority conditions ── */}
          <Section
            eyebrow="Detected by the demo health engine"
            title="Priority conditions"
            action={<span className="font-mono text-sm tabular text-ink-3">{conditions.length} active</span>}
          >
            {conditions.length === 0 ? (
              <EmptyState title="No active conditions">All tracked assets are within demo limits.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {conditions.map((c) => {
                  const detected = c.evidence.find((e) => e.level === "detected");
                  return (
                    <li key={`${c.assetId}-${c.id}`}>
                      <Link
                        href={`/assets/${c.assetId}?entity=${c.entityId}`}
                        className={`group flex flex-wrap items-start gap-4 rounded-xl border border-l-4 border-line bg-sunken/50 px-5 py-4 transition-colors hover:bg-raised/60 ${STATUS_META[c.status].accent}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-ink">{c.title}</span>
                            <StatusBadge status={c.status} size="sm" />
                          </div>
                          <div className="mt-1 text-sm text-ink-2">
                            {c.asset.summary.asset.name} · <span className="text-ink">{c.nodeName}</span> · {c.asset.plant.name}
                          </div>
                          {detected && (
                            <div className="mt-2.5 flex items-start gap-2 text-sm text-ink-2">
                              <EvidenceBadge level="detected" />
                              <span className="min-w-0">{detected.statement}</span>
                            </div>
                          )}
                          {!c.technicianConfirmed && (
                            <p className="mt-2 text-xs text-ink-3">No technician-confirmed failure on record.</p>
                          )}
                        </div>
                        <span className="flex items-center gap-1 self-center text-sm font-medium text-accent">
                          Inspect <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {/* ── Health distribution ── */}
          <Section eyebrow="Tracked demo assets" title="Equipment health distribution">
            <HealthDonut summary={p.health} />
            <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-3">
              Status is computed live from simulated telemetry by the same health engine used on every asset page. Unknown means
              no monitored signal or recent inspection, never healthy.
            </p>
          </Section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {/* ── Condition trends ── */}
          <Section eyebrow="Simulated demo telemetry" title="Condition trends">
            <PortfolioTrends
              series={assets
                .filter((a) => a.recentTelemetry.length > 0)
                .map((a) => ({ assetId: a.summary.asset.id, name: a.summary.asset.name, frames: a.recentTelemetry }))}
            />
          </Section>

          {/* ── Assets requiring review ── */}
          <Section
            eyebrow="Not healthy"
            title="Assets requiring review"
            action={
              <Link href="/equipment" className="text-sm font-medium text-accent hover:underline">
                All equipment
              </Link>
            }
          >
            {review.length === 0 ? (
              <EmptyState title="Nothing requires review">All tracked assets are healthy.</EmptyState>
            ) : (
              <ul className="space-y-3">
                {review.map((a) => (
                  <li key={a.summary.asset.id}>
                    <Link
                      href={`/assets/${a.summary.asset.id}`}
                      className="group flex items-center gap-4 rounded-xl border border-line bg-sunken/50 px-4 py-3.5 transition-colors hover:bg-raised/60"
                    >
                      <span className={`h-10 w-1 shrink-0 rounded-full ${STATUS_META[a.summary.status].fill}`} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold text-ink">{a.summary.asset.name}</span>
                        <span className="block truncate text-xs text-ink-3">
                          {a.summary.topConcern ? `${a.summary.topConcern.condition.title} · ${a.summary.topConcern.nodeName}` : a.summary.asset.equipmentType}
                        </span>
                        <span className="block truncate text-xs text-ink-3">
                          {a.plant.name} · {a.unit.name} · s/n <span className="font-mono">{a.summary.asset.serialNumber}</span>
                        </span>
                      </span>
                      <StatusBadge status={a.summary.status} size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* ── Recent service activity ── */}
        <Section
          eyebrow="Demo service records"
          title="Recent service activity"
          action={<History size={18} className="text-ink-3" aria-hidden />}
        >
          {p.service.length === 0 ? (
            <EmptyState title="No service records" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-[0.08em] text-ink-3">
                    <th className="py-2.5 pr-4 font-semibold">Date</th>
                    <th className="py-2.5 pr-4 font-semibold">Equipment</th>
                    <th className="py-2.5 pr-4 font-semibold">Event</th>
                    <th className="py-2.5 pr-4 font-semibold">Description</th>
                    <th className="py-2.5 font-semibold">Work order</th>
                  </tr>
                </thead>
                <tbody>
                  {p.service.slice(0, 6).map((e) => (
                    <tr key={e.id} className="border-b border-line last:border-0">
                      <td className="whitespace-nowrap py-3 pr-4 font-mono text-ink-2">{formatDate(e.date)}</td>
                      <td className="py-3 pr-4">
                        <Link href={`/assets/${e.assetId}`} className="font-medium text-ink hover:text-accent">
                          {e.assetName}
                        </Link>
                        {e.entityName !== e.assetName && <div className="text-xs text-ink-3">{e.entityName}</div>}
                      </td>
                      <td className="py-3 pr-4 capitalize text-ink-2">{e.type}</td>
                      <td className="py-3 pr-4 text-ink-2">{e.description}</td>
                      <td className="whitespace-nowrap py-3 font-mono text-xs text-ink-3">{e.workOrder}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <p className="flex items-center gap-2 text-xs text-ink-3">
          <CalendarClock size={14} aria-hidden />
          Planned outages on record: {p.plannedOutages.length}.{" "}
          <Link href="/outage-planning" className="font-medium text-accent hover:underline">
            Open Outage Planning
          </Link>
          <span aria-hidden>·</span>
          <ScanSearch size={14} aria-hidden /> Press <kbd className="rounded border border-line-strong bg-raised px-1.5 font-mono">Ctrl K</kbd> to search anything.
        </p>
      </main>
    </>
  );
}
