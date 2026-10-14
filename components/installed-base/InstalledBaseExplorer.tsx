"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, ChevronRight, Cog, Factory, Flame, Search, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META, STATUS_ORDER } from "@/components/ui/status";
import { formatDate, formatNumber } from "@/lib/format";
import type { HealthStatus } from "@/types/installed-base";

export interface ExplorerRow {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  equipmentType: string;
  position: string;
  status: HealthStatus;
  conditionCount: number;
  topConcern: string | null;
  lastService: string | null;
  cycles: number;
  customer: { id: string; name: string };
  plant: { id: string; name: string; location: string };
  unit: { id: string; name: string };
}

export interface ExplorerTreeCustomer {
  id: string;
  name: string;
  plants: { id: string; name: string; location: string; units: { id: string; name: string; unitType: string }[] }[];
}

type Scope = { level: "all" } | { level: "customer"; id: string } | { level: "plant"; id: string } | { level: "unit"; id: string };

const RANK: Record<HealthStatus, number> = { critical: 0, attention: 1, unknown: 2, healthy: 3 };

/**
 * Customer → Plant → Unit → Equipment explorer. The left navigator scopes the
 * equipment list; search and filters narrow it further. All data comes from
 * the demo installed base (server-derived health, same as the asset pages).
 */
export function InstalledBaseExplorer({
  tree,
  rows,
  initialScope,
}: {
  tree: ExplorerTreeCustomer[];
  rows: ExplorerRow[];
  initialScope: Scope;
}) {
  const [scope, setScope] = useState<Scope>(initialScope);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<HealthStatus | "all">("all");
  const [model, setModel] = useState<string>("all");

  const models = useMemo(() => [...new Set(rows.map((r) => r.model))].sort(), [rows]);

  const scoped = rows.filter((r) =>
    scope.level === "all"
      ? true
      : scope.level === "customer"
        ? r.customer.id === scope.id
        : scope.level === "plant"
          ? r.plant.id === scope.id
          : r.unit.id === scope.id,
  );
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = scoped
    .filter((r) => status === "all" || r.status === status)
    .filter((r) => model === "all" || r.model === model)
    .filter((r) => {
      const hay = `${r.name} ${r.model} ${r.serialNumber} ${r.equipmentType} ${r.position} ${r.plant.name} ${r.unit.name} ${r.customer.name} ${r.topConcern ?? ""}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    })
    .sort((a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name));

  const countIn = (pred: (r: ExplorerRow) => boolean) => rows.filter(pred).length;
  const scopeLabel = (() => {
    if (scope.level === "all") return "All equipment";
    for (const c of tree) {
      if (scope.level === "customer" && c.id === scope.id) return c.name;
      for (const p of c.plants) {
        if (scope.level === "plant" && p.id === scope.id) return `${c.name} › ${p.name}`;
        for (const u of p.units) if (scope.level === "unit" && u.id === scope.id) return `${c.name} › ${p.name} › ${u.name}`;
      }
    }
    return "All equipment";
  })();
  const filtersActive = query !== "" || status !== "all" || model !== "all";

  const navButton = (active: boolean) =>
    `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
      active ? "bg-accent-soft font-semibold text-ink shadow-[inset_0_0_0_1px_rgb(56_139_255/0.35)]" : "text-ink-2 hover:bg-white/[0.04] hover:text-ink"
    }`;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* ── Hierarchy navigator ── */}
      <nav aria-label="Installed base hierarchy" className="self-start rounded-xl border border-line bg-panel p-3 shadow-panel lg:sticky lg:top-20">
        <div className="eyebrow px-3 pb-2 pt-1">Browse</div>
        <button type="button" className={navButton(scope.level === "all")} onClick={() => setScope({ level: "all" })}>
          <Cog size={16} className="shrink-0 text-ink-3" aria-hidden />
          <span className="flex-1">All equipment</span>
          <span className="font-mono text-xs tabular text-ink-3">{rows.length}</span>
        </button>
        <ul className="mt-2 space-y-1">
          {tree.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={navButton(scope.level === "customer" && scope.id === c.id)}
                onClick={() => setScope({ level: "customer", id: c.id })}
              >
                <Building2 size={16} className="shrink-0 text-ink-3" aria-hidden />
                <span className="flex-1">{c.name}</span>
                <span className="font-mono text-xs tabular text-ink-3">{countIn((r) => r.customer.id === c.id)}</span>
              </button>
              <ul className="ml-[22px] mt-1 space-y-1 border-l border-line pl-2">
                {c.plants.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={navButton(scope.level === "plant" && scope.id === p.id)}
                      onClick={() => setScope({ level: "plant", id: p.id })}
                    >
                      <Factory size={16} className="shrink-0 text-ink-3" aria-hidden />
                      <span className="flex-1">{p.name}</span>
                      <span className="font-mono text-xs tabular text-ink-3">{countIn((r) => r.plant.id === p.id)}</span>
                    </button>
                    <ul className="ml-[22px] mt-1 space-y-1 border-l border-line pl-2">
                      {p.units.map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            className={navButton(scope.level === "unit" && scope.id === u.id)}
                            onClick={() => setScope({ level: "unit", id: u.id })}
                          >
                            <Flame size={16} className="shrink-0 text-ink-3" aria-hidden />
                            <span className="flex-1">{u.name}</span>
                            <span className="font-mono text-xs tabular text-ink-3">{countIn((r) => r.unit.id === u.id)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {scope.level !== "all" && (
          <div className="mt-3 border-t border-line px-3 pt-3">
            {scope.level === "customer" && (
              <Link href={`/customers/${scope.id}`} className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                Customer overview <ArrowRight size={14} aria-hidden />
              </Link>
            )}
            {(scope.level === "plant" || scope.level === "unit") && (
              <Link
                href={`/plants/${scope.level === "plant" ? scope.id : (rows.find((r) => r.unit.id === scope.id)?.plant.id ?? "")}`}
                className="flex items-center gap-1 text-sm font-medium text-accent hover:underline"
              >
                Plant overview <ArrowRight size={14} aria-hidden />
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* ── Equipment list ── */}
      <section aria-label="Equipment" className="min-w-0">
        <div className="rounded-xl border border-line bg-panel p-4 shadow-panel">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-64 flex-1 flex-col gap-1.5">
              <span className="eyebrow">Search equipment</span>
              <span className="relative">
                <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, serial number, model, plant, position…"
                  className="h-11 w-full rounded-lg border border-line-strong bg-raised pl-10 pr-3 text-sm text-ink outline-none transition-shadow placeholder:text-ink-3 focus:border-accent focus:shadow-glow"
                />
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Model</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-11 rounded-lg border border-line-strong bg-raised px-3 text-sm text-ink"
              >
                <option value="all">All models</option>
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by health status">
            {(["all", ...STATUS_ORDER] as const).map((s) => {
              const n = s === "all" ? scoped.length : scoped.filter((r) => r.status === s).length;
              if (s === "unknown" && n === 0) return null;
              const meta = s === "all" ? null : STATUS_META[s];
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    status === s ? "border-accent bg-accent-soft text-ink" : "border-line-strong bg-raised/60 text-ink-2 hover:text-ink"
                  }`}
                >
                  {meta && <meta.icon size={13} className={meta.text} aria-hidden />}
                  {s === "all" ? "All statuses" : meta!.label}
                  <span className="font-mono tabular text-ink-3">{n}</span>
                </button>
              );
            })}
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setStatus("all");
                  setModel("all");
                }}
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <X size={13} aria-hidden /> Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="mb-3 mt-6 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{scopeLabel}</h2>
          <span className="text-sm text-ink-3">
            <span className="font-mono tabular text-ink">{visible.length}</span> of {scoped.length} equipment
          </span>
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center text-sm text-ink-3">
            No equipment matches these filters in the demo installed base.
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/assets/${r.id}`}
                  className={`group grid items-center gap-4 rounded-xl border border-l-4 border-line bg-panel px-5 py-4 shadow-panel transition-all hover:border-accent/40 hover:bg-raised/50 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] ${STATUS_META[r.status].accent}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold text-ink">{r.name}</span>
                      <StatusBadge status={r.status} size="sm" />
                    </div>
                    <div className="mt-1 text-sm text-ink-2">
                      {r.equipmentType} · <span className="font-mono">{r.model}</span> · s/n <span className="font-mono">{r.serialNumber}</span>
                    </div>
                    <div className="mt-1 text-sm text-ink-3">
                      {r.topConcern ? (
                        <>
                          <span className={STATUS_META[r.status].text}>Top concern:</span> {r.topConcern}
                        </>
                      ) : (
                        "No active conditions · monitored signals within demo limits"
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 text-sm">
                    <div className="eyebrow">Location</div>
                    <div className="mt-1 text-ink">
                      {r.plant.name} <ChevronRight size={13} className="inline text-ink-3" aria-hidden /> {r.unit.name}
                    </div>
                    <div className="text-ink-3">{r.position}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="eyebrow">Cycles</div>
                      <div className="mt-1 font-mono tabular text-ink">{formatNumber(r.cycles)}</div>
                    </div>
                    <div>
                      <div className="eyebrow">Last service</div>
                      <div className="mt-1 font-mono tabular text-ink">{formatDate(r.lastService)}</div>
                    </div>
                  </div>
                  <span className="hidden items-center gap-1 whitespace-nowrap text-sm font-semibold text-accent 2xl:flex">
                    Open workspace <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
