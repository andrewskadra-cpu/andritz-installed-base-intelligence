"use client";

import { Boxes, ChevronDown, ChevronRight, Cog, Wrench, type LucideIcon } from "lucide-react";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { StatusDot } from "@/components/ui/StatusBadge";
import type { SelectedNode } from "@/lib/asset-selection";
import type { Assembly, Asset, Component, HealthStatus } from "@/types/installed-base";

function TreeRow({
  label,
  status,
  icon: Icon,
  depth,
  selected,
  inPath,
  expandable,
  onClick,
}: {
  label: string;
  status: HealthStatus;
  icon: LucideIcon;
  depth: number;
  selected: boolean;
  inPath: boolean;
  expandable?: "open" | "closed";
  onClick: () => void;
}) {
  const Caret = expandable === "open" ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      style={{ paddingLeft: 8 + depth * 16 }}
      className={`flex w-full items-center gap-2 rounded py-1.5 pr-2 text-left text-sm transition-colors ${
        selected
          ? "bg-navy-900 text-white"
          : inPath
            ? "bg-canvas font-medium text-ink"
            : "text-ink-2 hover:bg-canvas hover:text-ink"
      }`}
    >
      <span className="w-3.5 shrink-0">
        {expandable && <Caret size={14} className={selected ? "text-navy-300" : "text-ink-3"} aria-hidden />}
      </span>
      <Icon size={15} className={`shrink-0 ${selected ? "text-navy-300" : "text-ink-3"}`} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <StatusDot status={status} className={selected ? "ring-2 ring-white/70" : ""} />
    </button>
  );
}

export function EquipmentHierarchy({
  asset,
  assemblies,
  components,
  selection,
  onSelect,
}: {
  asset: Asset;
  assemblies: Assembly[];
  components: Component[];
  selection: SelectedNode;
  onSelect: (nodeId: string | null) => void;
}) {
  return (
    <Panel>
      <PanelHeader eyebrow="Hierarchy" title="Equipment structure" />
      <nav className="space-y-0.5 p-2" aria-label="Equipment hierarchy">
        <TreeRow
          label={asset.name}
          status={asset.status}
          icon={Cog}
          depth={0}
          selected={selection.level === "asset"}
          inPath
          expandable="open"
          onClick={() => onSelect(null)}
        />
        {assemblies.map((assembly) => {
          const children = components.filter((c) => c.assemblyId === assembly.id);
          const open = selection.pathIds.includes(assembly.id);
          return (
            <div key={assembly.id}>
              <TreeRow
                label={assembly.name}
                status={assembly.status}
                icon={Boxes}
                depth={1}
                selected={selection.id === assembly.id}
                inPath={open}
                expandable={children.length > 0 ? (open ? "open" : "closed") : undefined}
                onClick={() => onSelect(assembly.id)}
              />
              {open &&
                children.map((component) => (
                  <TreeRow
                    key={component.id}
                    label={component.name}
                    status={component.status}
                    icon={Wrench}
                    depth={2}
                    selected={selection.id === component.id}
                    inPath={false}
                    onClick={() => onSelect(component.id)}
                  />
                ))}
            </div>
          );
        })}
      </nav>
    </Panel>
  );
}
