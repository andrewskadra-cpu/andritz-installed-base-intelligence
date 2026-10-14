"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { PIItem, PISheet } from "@/lib/pi/pi-types";

const MAX_RESULTS = 8;

/** Sheet selector (prev / next / pick) and item search for one PI form. */
export function PISheetNavigator({
  sheets,
  activeSheetId,
  onSheet,
  items,
  onSearchSelect,
}: {
  sheets: PISheet[];
  activeSheetId: string;
  onSheet: (id: string) => void;
  items: PIItem[];
  onSearchSelect: (item: string) => void;
}) {
  const [query, setQuery] = useState("");
  const index = sheets.findIndex((s) => s.id === activeSheetId);
  const q = query.trim().toLowerCase();
  // Every word must appear in the name, so "worm gear" finds "GEAR, WORM, 40:1".
  const words = q.split(/[\s,]+/).filter(Boolean);
  const results = q
    ? items
        .filter(
          (i) =>
            i.item.toLowerCase().startsWith(q) ||
            i.partNumber?.toLowerCase().includes(q) ||
            (i.name !== undefined && words.every((w) => i.name!.toLowerCase().includes(w))),
        )
        // Exact item-number matches first.
        .sort((a, b) => Number(b.item.toLowerCase() === q) - Number(a.item.toLowerCase() === q))
        .slice(0, MAX_RESULTS)
    : [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex h-9 items-center overflow-hidden rounded-lg border border-line-strong bg-raised">
        <button
          type="button"
          aria-label="Previous sheet"
          disabled={index <= 0}
          onClick={() => onSheet(sheets[index - 1].id)}
          className="grid h-full w-8 place-items-center text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink disabled:opacity-35"
        >
          <ChevronLeft size={15} aria-hidden />
        </button>
        <select
          aria-label="Drawing sheet"
          value={activeSheetId}
          onChange={(e) => onSheet(e.target.value)}
          className="h-full border-x border-line-strong bg-raised px-2 text-xs font-medium text-ink"
        >
          {sheets.map((s, i) => (
            <option key={s.id} value={s.id}>
              {s.label} ({i + 1}/{sheets.length})
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Next sheet"
          disabled={index >= sheets.length - 1}
          onClick={() => onSheet(sheets[index + 1].id)}
          className="grid h-full w-8 place-items-center text-ink-2 transition-colors hover:bg-white/[0.06] hover:text-ink disabled:opacity-35"
        >
          <ChevronRight size={15} aria-hidden />
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              onSearchSelect(results[0].item);
              setQuery("");
            }
            if (e.key === "Escape") setQuery("");
          }}
          placeholder="Item, part number or name"
          aria-label="Search PI items"
          className="h-9 w-44 rounded-lg @2xl:w-60 border border-line-strong bg-raised pl-9 pr-2 text-xs text-ink outline-none transition-shadow placeholder:text-ink-3 focus:border-accent focus:shadow-glow"
        />
        {q && (
          <ul className="absolute right-0 z-20 mt-1.5 w-80 animate-fade overflow-hidden rounded-lg border border-line-strong bg-raised text-xs shadow-raised">
            {results.length === 0 && <li className="px-3 py-2 text-ink-3">No matching PI items.</li>}
            {results.map((r) => (
              <li key={r.item}>
                <button
                  type="button"
                  onClick={() => {
                    onSearchSelect(r.item);
                    setQuery("");
                  }}
                  className="flex w-full items-baseline gap-2 px-3 py-2 text-left transition-colors hover:bg-accent-soft"
                >
                  <span className="w-8 shrink-0 font-mono tabular text-ink-2">{r.item}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{r.name ?? "Unnamed item"}</span>
                  {r.partNumber && <span className="shrink-0 font-mono text-ink-3">{r.partNumber}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
