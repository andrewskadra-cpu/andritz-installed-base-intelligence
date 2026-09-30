"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Building2, Cog, CornerDownLeft, Factory, Flame, Search, Wrench, type LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { SearchEntry, SearchResultKind } from "@/types/installed-base";

const KIND_META: Record<SearchResultKind, { label: string; icon: LucideIcon }> = {
  customer: { label: "Customer", icon: Building2 },
  plant: { label: "Plant", icon: Factory },
  unit: { label: "Unit", icon: Flame },
  asset: { label: "Equipment", icon: Cog },
  assembly: { label: "Assembly", icon: Boxes },
  component: { label: "Part", icon: Wrench },
};

const SUGGESTIONS = ["Demo Energy", "Riverbend", "10482", "IK-700", "Gearbox", "B-204"];
const MAX_RESULTS = 12;

function matches(entry: SearchEntry, tokens: string[]) {
  const haystack = `${entry.title} ${entry.subtitle} ${entry.keywords}`.toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

export function InstalledBaseSearch({ index }: { index: SearchEntry[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    return index.filter((e) => matches(e, tokens));
  }, [index, query]);

  const hasQuery = query.trim().length > 0;

  return (
    <div>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (results[0]) router.push(results[0].href);
        }}
        className="relative"
      >
        <Search
          size={20}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Customer, plant, serial number, equipment or part…"
          aria-label="Search installed base"
          autoFocus
          className="h-14 w-full rounded-md border border-line-strong bg-panel pl-12 pr-28 text-base text-ink shadow-sm outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden focus:border-navy-700 focus:ring-2 focus:ring-navy-700/15"
        />
        <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-line bg-canvas px-2 py-1 font-mono text-[11px] text-ink-3 sm:flex">
          <CornerDownLeft size={12} aria-hidden /> open first
        </kbd>
      </form>

      {!hasQuery && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-3">
          <span>Try:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuery(s)}
              className="rounded border border-line bg-panel px-2 py-1 font-medium text-ink-2 hover:border-line-strong hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {hasQuery && (
        <div className="mt-3 overflow-hidden rounded-md border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-ink-3">
            <span>
              {results.length} {results.length === 1 ? "match" : "matches"} in demo installed base
            </span>
            {results.length > MAX_RESULTS && <span>Showing first {MAX_RESULTS}</span>}
          </div>
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-3">
              No records match “{query.trim()}”. Only the demo customer is loaded.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {results.slice(0, MAX_RESULTS).map((entry) => {
                const meta = KIND_META[entry.kind];
                const Icon = meta.icon;
                return (
                  <li key={`${entry.kind}-${entry.id}`}>
                    <Link
                      href={entry.href}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas focus:bg-canvas focus:outline-none"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded bg-canvas text-ink-2">
                        <Icon size={16} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{entry.title}</span>
                        <span className="block truncate text-xs text-ink-3">{entry.subtitle}</span>
                      </span>
                      <span className="hidden w-20 text-right text-[11px] font-medium uppercase tracking-wide text-ink-3 sm:block">
                        {meta.label}
                      </span>
                      <span className="w-24 text-right">
                        {entry.status && <StatusBadge status={entry.status} size="sm" />}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
