"use client";

import { useState } from "react";
import { Boxes, ChevronDown, ChevronRight, Cog, Wrench, type LucideIcon } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { StatusDot } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import type { AssetModel, NodeType } from "@/lib/asset-model";
import type { Selection } from "@/lib/asset-selection";

const TYPE_ICON: Record<NodeType, LucideIcon> = { asset: Cog, assembly: Boxes, component: Wrench };

/**
 * Recursive equipment navigator. Selection is owned by the page; this component
 * only keeps which branches the user has collapsed (all expanded by default).
 */
export function EquipmentHierarchy({
  model,
  selection,
  onSelect,
}: {
  model: AssetModel;
  selection: Selection;
  onSelect: (id: string | null) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const pathIds = new Set(selection.path.map((n) => n.id));

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNode = (id: string) => {
    const node = model.nodes[id];
    const Icon = TYPE_ICON[node.type];
    const hasChildren = node.childIds.length > 0;
    // A branch on the selected path is always shown open.
    const open = hasChildren && (!collapsed.has(id) || (pathIds.has(id) && id !== selection.node.id));
    const selected = selection.node.id === id;
    const inPath = pathIds.has(id) && !selected;
    const Caret = open ? ChevronDown : ChevronRight;

    return (
      <li key={id} role="treeitem" aria-expanded={hasChildren ? open : undefined} aria-selected={selected}>
        <div
          className={`flex items-center rounded text-sm transition-colors ${
            selected ? "bg-navy-900 text-white" : inPath ? "bg-canvas text-ink" : "text-ink-2 hover:bg-canvas hover:text-ink"
          }`}
          style={{ paddingLeft: 4 + node.depth * 16 }}
        >
          <button
            type="button"
            tabIndex={hasChildren ? 0 : -1}
            onClick={() => hasChildren && toggle(id)}
            aria-label={hasChildren ? `${open ? "Collapse" : "Expand"} ${node.name}` : undefined}
            className={`grid size-6 shrink-0 place-items-center rounded ${hasChildren ? "hover:bg-black/10" : "invisible"}`}
          >
            <Caret size={14} className={selected ? "text-navy-300" : "text-ink-3"} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onSelect(node.type === "asset" ? null : id)}
            aria-current={selected ? "true" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-left"
          >
            <Icon size={15} className={`shrink-0 ${selected ? "text-navy-300" : "text-ink-3"}`} aria-hidden />
            <span className={`min-w-0 flex-1 truncate ${selected || inPath ? "font-medium" : ""}`}>{node.name}</span>
            <span className="sr-only">{STATUS_META[node.status].label}</span>
            <StatusDot status={node.status} className={selected ? "ring-2 ring-white/70" : ""} />
          </button>
        </div>
        {open && <ul role="group">{node.childIds.map(renderNode)}</ul>}
      </li>
    );
  };

  return (
    <Panel>
      <PanelHeader eyebrow="Hierarchy" title="Equipment structure" />
      <ul className="space-y-0.5 p-2" role="tree" aria-label="Equipment hierarchy">
        {renderNode(model.rootId)}
      </ul>
    </Panel>
  );
}
