"use client";

import { useState } from "react";
import { Boxes, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Cog, Search, Wrench, X, type LucideIcon } from "lucide-react";
import { StatusDot } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import type { AssetModel, NodeType } from "@/lib/asset-model";
import type { Selection } from "@/lib/asset-selection";

const TYPE_ICON: Record<NodeType, LucideIcon> = { asset: Cog, assembly: Boxes, component: Wrench };
const INDENT = 14;

/**
 * Equipment navigator. Selection is owned by the page; this component only
 * keeps which branches are collapsed and the filter text. Full names are
 * always shown (they wrap rather than truncate); indentation is shallow with
 * guide lines so deep components stay readable.
 */
export function EquipmentHierarchy({
  model,
  selection,
  onSelect,
  onClose,
}: {
  model: AssetModel;
  selection: Selection;
  onSelect: (id: string | null) => void;
  /** Hide the tree (workspace gains the space). */
  onClose?: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState("");
  const pathIds = new Set(selection.path.map((n) => n.id));

  const branchIds = Object.values(model.nodes)
    .filter((n) => n.childIds.length > 0 && n.id !== model.rootId)
    .map((n) => n.id);
  const allCollapsed = branchIds.length > 0 && branchIds.every((id) => collapsed.has(id));

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Filter: matching nodes plus their ancestors stay visible (and open).
  const q = filter.trim().toLowerCase();
  const isHit = (id: string) => `${model.nodes[id].name} ${model.nodes[id].partNumber ?? ""}`.toLowerCase().includes(q);
  const visible = new Set<string>();
  let matches = 0;
  if (q) {
    for (const n of Object.values(model.nodes)) {
      if (!isHit(n.id)) continue;
      matches += 1;
      for (let id: string | null = n.id; id; id = model.nodes[id]?.parentId ?? null) visible.add(id);
    }
  }

  const renderNode = (id: string) => {
    const node = model.nodes[id];
    if (q && !visible.has(id)) return null;
    const Icon = TYPE_ICON[node.type];
    const hasChildren = node.childIds.length > 0;
    // A branch on the selected path, or holding filter matches, is always shown open.
    const open = hasChildren && (q !== "" || !collapsed.has(id) || (pathIds.has(id) && id !== selection.node.id));
    const selected = selection.node.id === id;
    const inPath = pathIds.has(id) && !selected;
    const isMatch = q !== "" && isHit(id);
    const Caret = open ? ChevronDown : ChevronRight;
    const status = STATUS_META[node.status];

    return (
      <li key={id} role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected={selected}>
        <div
          className={`group relative flex items-start rounded-lg text-sm transition-colors ${
            selected
              ? "bg-accent-strong text-white shadow-glow"
              : inPath
                ? "bg-white/[0.05] text-ink"
                : "text-ink-2 hover:bg-white/[0.04] hover:text-ink"
          }`}
          style={{ paddingLeft: 4 + node.depth * INDENT }}
        >
          <button
            type="button"
            tabIndex={hasChildren ? 0 : -1}
            onClick={() => hasChildren && toggle(id)}
            aria-label={hasChildren ? `${open ? "Collapse" : "Expand"} ${node.name}` : undefined}
            className={`mt-[6px] grid size-6 shrink-0 place-items-center rounded-md ${hasChildren ? "hover:bg-white/10" : "invisible"}`}
          >
            <Caret size={15} className={selected ? "text-white/80" : "text-ink-3"} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onSelect(node.type === "asset" ? null : id)}
            aria-current={selected ? "true" : undefined}
            title={`${node.name} · ${node.type} · ${status.label}${node.partNumber ? ` · ${node.partNumber}` : ""}`}
            className="flex min-w-0 flex-1 items-start gap-2 py-2 pr-3 text-left"
          >
            <Icon
              size={15}
              className={`mt-[3px] shrink-0 ${selected ? "text-white/80" : inPath ? "text-info" : "text-ink-3"}`}
              aria-hidden
            />
            <span
              className={`min-w-0 flex-1 break-words leading-snug ${selected || inPath ? "font-semibold" : ""} ${
                isMatch && !selected ? "text-ink underline decoration-accent decoration-2 underline-offset-4" : ""
              }`}
            >
              {node.name}
            </span>
            <span className="sr-only">{status.label}</span>
            <StatusDot status={node.status} className={`mt-[5px] ${selected ? "ring-2 ring-white/70" : ""}`} />
          </button>
        </div>
        {open && (
          <ul role="group" className="relative">
            <span aria-hidden className="absolute bottom-2 top-0 w-px bg-line" style={{ left: 4 + node.depth * INDENT + 11 }} />
            {node.childIds.map(renderNode)}
          </ul>
        )}
      </li>
    );
  };

  return (
    <section
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-panel"
      aria-label="Equipment hierarchy"
    >
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <div className="eyebrow">Hierarchy</div>
          <h2 className="truncate text-base font-semibold tracking-tight text-ink">Equipment structure</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(branchIds))}
            title={allCollapsed ? "Expand all" : "Collapse all"}
            aria-label={allCollapsed ? "Expand all branches" : "Collapse all branches"}
            className="grid size-8 place-items-center rounded-md text-ink-3 transition-colors hover:bg-white/[0.06] hover:text-ink"
          >
            {allCollapsed ? <ChevronsUpDown size={16} aria-hidden /> : <ChevronsDownUp size={16} aria-hidden />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Hide equipment tree"
              aria-label="Hide equipment tree"
              className="grid size-8 place-items-center rounded-md text-ink-3 transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      </header>
      <div className="border-b border-line px-3 py-2.5">
        <label className="relative block">
          <span className="sr-only">Filter equipment tree</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setFilter("")}
            placeholder="Find component…"
            className="h-9 w-full rounded-lg border border-line-strong bg-raised pl-9 pr-3 text-sm text-ink outline-none transition-shadow placeholder:text-ink-3 focus:border-accent focus:shadow-glow"
          />
        </label>
        {q && (
          <p className="mt-1.5 px-1 text-xs text-ink-3" aria-live="polite">
            {matches} match{matches === 1 ? "" : "es"}
          </p>
        )}
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2" role="tree" aria-label="Equipment hierarchy">
        {renderNode(model.rootId)}
      </ul>
    </section>
  );
}
