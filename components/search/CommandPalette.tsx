"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Building2,
  CornerDownLeft,
  Cog,
  Factory,
  Flame,
  Package,
  Search,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { DESTINATIONS } from "@/components/layout/AppSidebar";
import { usePartsCatalog } from "@/components/parts-support/usePartsCatalog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { sourceLabel } from "@/lib/parts/catalog";
import { scorePart } from "@/lib/parts/part-search";
import type { ComponentNames } from "@/lib/parts/part-context";
import type { HealthStatus, SearchEntry, SearchResultKind } from "@/types/installed-base";

/** Open the palette from anywhere (e.g. the top-bar trigger). */
export const OPEN_SEARCH_EVENT = "ibis-open-search";
export function openGlobalSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}

type GroupKey = "asset" | "component" | "customer" | "plant" | "unit" | "part";

const GROUPS: { key: GroupKey; label: string; icon: LucideIcon }[] = [
  { key: "asset", label: "Equipment", icon: Cog },
  { key: "component", label: "Assemblies & components", icon: Wrench },
  { key: "customer", label: "Customers", icon: Building2 },
  { key: "plant", label: "Plants", icon: Factory },
  { key: "unit", label: "Units", icon: Flame },
  { key: "part", label: "Catalog parts & PI items", icon: Package },
];

const GROUP_OF: Record<SearchResultKind, GroupKey> = {
  asset: "asset",
  assembly: "component",
  component: "component",
  customer: "customer",
  plant: "plant",
  unit: "unit",
};

const PER_GROUP = 6;

interface Result {
  key: string;
  group: GroupKey;
  title: string;
  subtitle: string;
  href: string;
  status: HealthStatus | null;
  icon?: LucideIcon;
}

function matches(entry: SearchEntry, tokens: string[]) {
  const haystack = `${entry.title} ${entry.subtitle} ${entry.keywords}`.toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}

/**
 * App-wide search over local demo data only: the installed-base index built
 * on the server, plus catalog parts / PI items from the local PI manifest
 * (when present). Nothing is sent to any external service.
 * Shortcuts: Ctrl/⌘+K anywhere, "/" when not typing.
 */
export function CommandPalette({ index, componentNames }: { index: SearchEntry[]; componentNames: ComponentNames }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable=true]");
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  if (!open) return null;
  return <PaletteDialog index={index} componentNames={componentNames} onClose={() => setOpen(false)} />;
}

function PaletteDialog({
  index,
  componentNames,
  onClose,
}: {
  index: SearchEntry[];
  componentNames: ComponentNames;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Loaded only while the palette is open; unavailable without local PI assets.
  const catalog = usePartsCatalog();

  useEffect(() => {
    inputRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.trim();
    if (!q) {
      return DESTINATIONS.map((d) => ({
        key: `nav-${d.href}`,
        group: "asset" as GroupKey,
        title: d.label,
        subtitle: "Go to",
        href: d.href,
        status: null,
        icon: d.icon,
      }));
    }
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out: Result[] = [];
    const counts = new Map<GroupKey, number>();
    for (const e of index) {
      const group = GROUP_OF[e.kind];
      if ((counts.get(group) ?? 0) >= PER_GROUP || !matches(e, tokens)) continue;
      counts.set(group, (counts.get(group) ?? 0) + 1);
      out.push({ key: `${e.kind}-${e.id}`, group, title: e.title, subtitle: e.subtitle, href: e.href, status: e.status });
    }
    if (catalog.status === "ready") {
      const parts = catalog.catalog.parts
        .map((p) => ({ p, score: scorePart(p, catalog.catalog.assembly, q, componentNames) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, PER_GROUP);
      for (const { p } of parts) {
        out.push({
          key: `part-${p.id}`,
          group: "part",
          title: p.description,
          subtitle: [
            p.references.map(sourceLabel).join(", "),
            p.partNumber ? `Part no. ${p.partNumberStatus === "bracketed" ? `(${p.partNumber})` : p.partNumber}` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          href: `/parts-support/parts/${p.id}`,
          status: null,
        });
      }
    }
    const order = GROUPS.map((g) => g.key);
    return out.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  }, [query, index, catalog, componentNames]);

  const active = Math.min(cursor, Math.max(results.length - 1, 0));

  const go = (r: Result | undefined) => {
    if (!r) return;
    onClose();
    router.push(r.href);
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const empty = query.trim() !== "" && results.length === 0;
  let lastGroup: GroupKey | null = null;
  const rows: ReactNode[] = [];
  results.forEach((r, i) => {
    if (query.trim() && r.group !== lastGroup) {
      lastGroup = r.group;
      const g = GROUPS.find((x) => x.key === r.group)!;
      rows.push(
        <div key={`h-${r.group}`} className="eyebrow flex items-center gap-2 px-4 pb-1.5 pt-4" role="presentation">
          <g.icon size={13} aria-hidden /> {g.label}
        </div>,
      );
    }
    const Icon = r.icon ?? GROUPS.find((x) => x.key === r.group)!.icon;
    rows.push(
      <button
        key={r.key}
        id={`palette-option-${i}`}
        type="button"
        role="option"
        aria-selected={i === active}
        data-index={i}
        onMouseMove={() => setCursor(i)}
        onClick={() => go(r)}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
          i === active ? "bg-accent-soft" : "hover:bg-white/[0.03]"
        }`}
      >
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-lg ${i === active ? "bg-accent/20 text-accent" : "bg-raised text-ink-3"}`}
        >
          <Icon size={17} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{r.title}</span>
          <span className="block truncate text-xs text-ink-3">{r.subtitle}</span>
        </span>
        {r.status && <StatusBadge status={r.status} size="sm" />}
        {i === active && <CornerDownLeft size={15} className="shrink-0 text-accent" aria-hidden />}
      </button>,
    );
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-navy-950/70 px-4 pt-[12vh] backdrop-blur-sm animate-fade" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search IBIS"
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[72vh] w-full max-w-2xl animate-enter flex-col overflow-hidden rounded-xl border border-line-strong bg-panel shadow-raised"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={20} className="shrink-0 text-ink-3" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={results.length ? `palette-option-${active}` : undefined}
            aria-label="Search customers, plants, equipment, serial numbers, components, PI items and part numbers"
            placeholder="Search equipment, serial no., component, PI item or part no."
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3 [&::-webkit-search-cancel-button]:hidden"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="rounded-md p-1.5 text-ink-3 hover:bg-white/[0.06] hover:text-ink">
            <X size={18} aria-hidden />
          </button>
        </div>

        <div ref={listRef} id="palette-results" role="listbox" aria-label="Search results" className="flex-1 overflow-y-auto py-2">
          {!query.trim() && <div className="eyebrow px-4 pb-1.5 pt-2">Go to</div>}
          {rows}
          {empty && (
            <p className="px-4 py-10 text-center text-sm text-ink-3">
              No matches for “{query.trim()}” in the demo installed base
              {catalog.status === "unavailable" ? " (parts catalog not available in this environment)" : ""}.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-sunken/70 px-4 py-2.5 text-2xs text-ink-3">
          <span className="flex items-center gap-3">
            <span><Kbd>↑</Kbd> <Kbd>↓</Kbd> navigate</span>
            <span><Kbd>Enter</Kbd> open</span>
            <span><Kbd>Esc</Kbd> close</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Boxes size={12} aria-hidden /> Local demo data only
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line-strong bg-raised px-1.5 py-0.5 font-mono text-2xs text-ink-2">{children}</kbd>;
}
