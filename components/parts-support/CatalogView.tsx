"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Headset, Info, Link2, Loader2, Search, X } from "lucide-react";
import { CATEGORY_LABEL, CATEGORY_ORDER, sourceLabel } from "@/lib/parts/catalog";
import { componentName, contextQuery, partsSupportHref } from "@/lib/parts/part-context";
import { searchCatalog } from "@/lib/parts/part-search";
import type { CatalogPart, EquipmentContext, PartCategory, PartsCatalog } from "@/types/parts-commerce";
import { AddToInquiryButton, PartNumber, QuantityStepper, ReferenceBadge } from "./PartBits";
import { PartsSupportShell } from "./PartsSupportShell";
import { useComponentNames } from "./PartsSupportContext";
import { CatalogUnavailable } from "./CatalogUnavailable";
import { usePartsCatalog } from "./usePartsCatalog";

function PartRow({ part, context }: { part: CatalogPart; context: EquipmentContext | null }) {
  const names = useComponentNames();
  const [quantity, setQuantity] = useState(1);
  const primary = part.references[0];
  const href = partsSupportHref(`/parts/${part.id}`, context);

  return (
    <li className="group grid gap-3 px-4 py-3.5 transition-colors hover:bg-raised/70 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="flex min-w-0 gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-accent/25 bg-panel font-mono text-2xs font-semibold text-accent"
          title={`${sourceLabel(primary)} (drawing position, not a part number)`}
        >
          {primary.item}
        </span>
        <div className="min-w-0">
          <Link href={href} className="text-sm font-semibold leading-snug text-ink hover:text-accent hover:underline">
            {part.description}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
            <span>
              Part no. <PartNumber value={part.partNumber} status={part.partNumberStatus} className="font-medium" />
            </span>
            <span className="font-mono">{part.references.map(sourceLabel).join(", ")}</span>
            <span>{primary.sheets.join(", ")}</span>
            <span>{CATEGORY_LABEL[part.category]}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <ReferenceBadge required={part.confirmationReasons.length > 0} />
            {part.componentKeys.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded border border-line bg-raised px-1.5 py-0.5 text-2xs text-ink-2">
                <Link2 size={11} className="text-info" aria-hidden />
                IBIS: {part.componentKeys.map((k) => componentName(names, k)).join(", ")}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-2 pl-13 md:justify-end md:pl-0">
        <QuantityStepper value={quantity} onChange={setQuantity} label={`Requested quantity for ${part.description}`} size="sm" />
        <AddToInquiryButton part={part} quantity={quantity} context={context} source="catalog" size="sm" showViewLink={false} />
        <Link
          href={href}
          className="inline-flex items-center gap-0.5 self-center text-xs font-medium text-accent hover:underline"
          aria-label={`Part details for ${part.description}`}
        >
          Details <ChevronRight size={13} aria-hidden />
        </Link>
      </div>
    </li>
  );
}

function Filters({
  catalog,
  counts,
  category,
  sheet,
  onCategory,
  onSheet,
}: {
  catalog: PartsCatalog;
  counts: Map<PartCategory, number>;
  category: PartCategory | null;
  sheet: string | null;
  onCategory: (c: PartCategory | null) => void;
  onSheet: (s: string | null) => void;
}) {
  const option = (active: boolean) =>
    `flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-sm transition-colors ${
      active ? "bg-accent-strong font-medium text-white" : "text-ink-2 hover:bg-raised/70 hover:text-ink"
    }`;
  return (
    <div className="space-y-5">
      <div>
        <h2 className="px-2.5 pb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3">Category</h2>
        <ul className="space-y-0.5">
          <li>
            <button type="button" className={option(category === null)} onClick={() => onCategory(null)} aria-pressed={category === null}>
              All categories <span className="font-mono text-xs tabular opacity-70">{catalog.parts.length}</span>
            </button>
          </li>
          {CATEGORY_ORDER.filter((c) => counts.get(c)).map((c) => (
            <li key={c}>
              <button type="button" className={option(category === c)} onClick={() => onCategory(c)} aria-pressed={category === c}>
                {CATEGORY_LABEL[c]} <span className="font-mono text-xs tabular opacity-70">{counts.get(c)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="px-2.5 pb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3">
          Shown on {catalog.formLabel}
        </h2>
        <ul className="space-y-0.5">
          <li>
            <button type="button" className={option(sheet === null)} onClick={() => onSheet(null)} aria-pressed={sheet === null}>
              All sheets
            </button>
          </li>
          {catalog.sheets.map((s) => (
            <li key={s.id}>
              <button type="button" className={option(sheet === s.id)} onClick={() => onSheet(s.id)} aria-pressed={sheet === s.id}>
                <span className="truncate">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CatalogBody({
  catalog,
  context,
  initial,
}: {
  catalog: PartsCatalog;
  context: EquipmentContext | null;
  initial: { query: string; category: PartCategory | null; sheet: string | null };
}) {
  const names = useComponentNames();
  const [query, setQuery] = useState(initial.query);
  const [category, setCategory] = useState(initial.category);
  const [sheet, setSheet] = useState(initial.sheet);

  // Keep the URL shareable / back-navigable without a server round trip.
  useEffect(() => {
    const url = `${window.location.pathname}${contextQuery(context, { q: query.trim(), category: category ?? "", sheet: sheet ?? "" })}`;
    window.history.replaceState(window.history.state, "", url);
  }, [query, category, sheet, context]);

  const results = useMemo(() => searchCatalog(catalog, { query, category, sheet }, names), [catalog, query, category, sheet, names]);
  const counts = useMemo(() => {
    const map = new Map<PartCategory, number>();
    for (const p of catalog.parts) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return map;
  }, [catalog]);

  const searching = query.trim().length > 0;
  const groups = searching
    ? [{ category: null, parts: results }]
    : CATEGORY_ORDER.map((c) => ({ category: c, parts: results.filter((p) => p.category === c) })).filter((g) => g.parts.length);
  const filtered = searching || category || sheet;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-18 lg:self-start">
        <Filters catalog={catalog} counts={counts} category={category} sheet={sheet} onCategory={setCategory} onSheet={setSheet} />
        <div className="mt-6 rounded border border-line bg-panel p-3 text-xs text-ink-2">
          <p className="font-semibold text-ink">Not sure which part you need?</p>
          <p className="mt-1 text-ink-3">Describe the problem and our team will help identify the right reference.</p>
          <Link
            href={partsSupportHref("/contact", context, { topic: "parts" })}
            className="mt-2 inline-flex items-center gap-1 font-medium text-accent hover:underline"
          >
            <Headset size={13} aria-hidden /> Contact Us for parts assistance
          </Link>
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="rounded-md border border-line bg-panel p-3 shadow-panel">
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3">Equipment family</span>
              <select className="h-10 rounded-lg border border-line-strong bg-raised px-2 text-sm text-ink" defaultValue={catalog.family}>
                <option value={catalog.family}>{catalog.family}</option>
                <option disabled>Other families: not yet indexed</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3">Assembly</span>
              <select className="h-10 rounded-lg border border-line-strong bg-raised px-2 text-sm text-ink" defaultValue="pi">
                <option value="pi">
                  {catalog.assembly} ({catalog.formLabel})
                </option>
              </select>
            </label>
            <label className="flex min-w-60 flex-1 flex-col gap-1">
              <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-ink-3">Search parts</span>
              <span className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Part number, PI item, description or component (e.g. worm gear, 63, bearing)"
                  aria-label="Search parts"
                  className="h-10 w-full rounded-lg border border-line-strong bg-raised pl-9 pr-9 text-sm text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:shadow-glow"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-3 hover:bg-raised/70 hover:text-ink"
                  >
                    <X size={14} aria-hidden />
                  </button>
                )}
              </span>
            </label>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-2xs leading-snug text-ink-3">
            <Info size={12} className="mt-px shrink-0" aria-hidden />
            Indexed from {catalog.formLabel} {catalog.assembly} for {catalog.family}. Item numbers are drawing positions, not part
            numbers. Prices, availability and delivery are confirmed by ANDRITZ in response to an inquiry.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-ink-2" role="status" aria-live="polite">
            <span className="font-mono font-semibold tabular text-ink">{results.length}</span> of {catalog.parts.length} parts
            {searching && (
              <>
                {" "}matching <span className="font-medium text-ink">“{query.trim()}”</span>
              </>
            )}
          </p>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory(null);
                setSheet(null);
              }}
              className="text-xs font-medium text-accent hover:underline"
            >
              Reset filters
            </button>
          )}
        </div>

        {results.length === 0 ? (
          <div className="rounded-md border border-dashed border-line-strong bg-panel px-6 py-10 text-center">
            <Search size={22} className="mx-auto text-ink-3" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-ink">No indexed parts match</p>
            <p className="mx-auto mt-1 max-w-md text-xs text-ink-3">
              Try a part number fragment, a PI item number (e.g. “36”), or a description such as “bearing”. Only parts documented on{" "}
              {catalog.formLabel} are indexed so far.
            </p>
            <Link
              href={partsSupportHref("/contact", context, { topic: "parts" })}
              className="mt-4 btn-secondary px-3 py-1.5 text-sm"
            >
              <Headset size={14} aria-hidden /> Ask ANDRITZ to help identify the part
            </Link>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.category ?? "results"} className="overflow-hidden rounded-md border border-line bg-panel shadow-panel">
              {g.category && (
                <header className="flex items-center justify-between border-b border-line bg-sunken/70 px-4 py-2">
                  <h2 className="text-2xs font-semibold uppercase tracking-[0.08em] text-ink-2">{CATEGORY_LABEL[g.category]}</h2>
                  <span className="font-mono text-xs tabular text-ink-3">{g.parts.length}</span>
                </header>
              )}
              <ul className="divide-y divide-line">
                {g.parts.map((p) => (
                  <PartRow key={p.id} part={p} context={context} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

export function CatalogView({
  context,
  initialQuery,
  initialCategory,
  initialSheet,
}: {
  context: EquipmentContext | null;
  initialQuery: string;
  initialCategory: PartCategory | null;
  initialSheet: string | null;
}) {
  const state = usePartsCatalog();
  return (
    <PartsSupportShell
      section="parts"
      title="Browse Parts"
      description="Search documented IK-700 carriage and gearbox parts and add them to an inquiry for a quotation."
      breadcrumbs={[{ label: "Browse Parts" }]}
      context={context}
    >
      {state.status === "loading" && (
        <p className="flex items-center gap-2 py-10 text-sm text-ink-3">
          <Loader2 size={15} className="animate-spin" aria-hidden /> Loading parts catalog…
        </p>
      )}
      {state.status === "unavailable" && <CatalogUnavailable context={context} />}
      {state.status === "ready" && (
        <CatalogBody catalog={state.catalog} context={context} initial={{ query: initialQuery, category: initialCategory, sheet: initialSheet }} />
      )}
    </PartsSupportShell>
  );
}
