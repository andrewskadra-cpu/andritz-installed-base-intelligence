import type { ReactNode } from "react";
import { KeyValue } from "@/components/ui/KeyValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import { formatDate, formatNumber } from "@/lib/format";
import { nodeMetrics, type AssetModel } from "@/lib/asset-model";
import type { Selection } from "@/lib/asset-selection";
import type { InspectionRecommendation } from "@/types/installed-base";

const TYPE_LABEL = { asset: "Asset", assembly: "Assembly", component: "Component" } as const;

/** Identity, health and level-appropriate metadata for the selected node. */
export function HealthSummary({
  model,
  selection,
  conditionCount,
  nextInspection,
}: {
  model: AssetModel;
  selection: Selection;
  conditionCount: number;
  nextInspection: InspectionRecommendation | null;
}) {
  const { node, path } = selection;
  const { asset } = model.records;
  const m = nodeMetrics(model, node.id);
  const parent = path.length > 1 ? path[path.length - 2] : null;
  const date = (e: { date: string } | null) => formatDate(e?.date ?? null);

  let fields: { label: string; value: ReactNode; mono?: boolean }[];
  let note: { label: string; text: string } | null = null;

  if (node.type === "asset") {
    fields = [
      { label: "Operating hours", value: formatNumber(asset.operatingHours), mono: true },
      { label: "Cycle count", value: formatNumber(model.currentCycles), mono: true },
      { label: "Last service", value: date(m.lastService), mono: true },
      { label: "Installed", value: formatDate(asset.installedDate), mono: true },
      { label: "Active conditions", value: conditionCount, mono: true },
      { label: "Assemblies", value: node.childIds.length, mono: true },
    ];
    note = {
      label: "Next suggested inspection consideration",
      text: nextInspection?.action ?? "None based on available condition indicators.",
    };
  } else if (node.type === "assembly") {
    fields = [
      { label: "Operating hours", value: formatNumber(m.operatingHours), mono: true },
      { label: "Cycles", value: formatNumber(m.cycles), mono: true },
      { label: "Last service", value: date(m.lastService), mono: true },
      { label: "Last replacement", value: date(m.lastReplacement), mono: true },
      { label: "Active conditions", value: conditionCount, mono: true },
      { label: "Subcomponents", value: node.childIds.length, mono: true },
    ];
  } else {
    fields = [
      { label: "Demo part number", value: node.partNumber ?? "—", mono: true },
      { label: "Parent", value: parent?.name ?? "—" },
      { label: "Last inspection", value: date(m.lastInspection), mono: true },
      { label: "Last replacement", value: date(m.lastReplacement), mono: true },
      {
        label: m.lastReplacement ? "Hours since replacement" : "Operating hours",
        value: formatNumber(m.operatingHours),
        mono: true,
      },
      { label: "Hours since service", value: formatNumber(m.hoursSinceService), mono: true },
      { label: "Issue count", value: conditionCount, mono: true },
    ];
    note = { label: "Latest service note", text: m.events[0]?.description ?? "No service recorded for this component." };
  }

  return (
    <div className={`border-l-4 px-4 py-4 ${STATUS_META[node.status].accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {TYPE_LABEL[node.type]}
            {node.type === "asset" ? ` · ${asset.equipmentType}` : parent ? ` · in ${parent.name}` : ""}
          </div>
          <div className="truncate text-base font-semibold text-ink">{node.name}</div>
        </div>
        <StatusBadge status={node.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {fields.map((f) => (
          <KeyValue key={f.label} label={f.label} value={f.value} mono={f.mono} />
        ))}
      </dl>
      {note && (
        <div className="mt-3 rounded bg-canvas px-3 py-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">{note.label}</div>
          <p className="mt-0.5 text-[13px] leading-snug text-ink">{note.text}</p>
        </div>
      )}
    </div>
  );
}
