import { ArrowRight, ClipboardCheck, ShieldAlert } from "lucide-react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { Panel, PanelHeader, SectionLabel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import { priorityArea, sortByPriority, sortBySeverity, type AssetModel } from "@/lib/asset-model";
import type { Selection } from "@/lib/asset-selection";
import type {
  ActiveCondition,
  ConditionEvidence,
  EvidenceLevel,
  InspectionRecommendation,
} from "@/types/installed-base";
import { HealthSummary } from "./HealthSummary";

const EVIDENCE_ORDER: EvidenceLevel[] = ["observed", "detected", "inferred", "confirmed"];

const PRIORITY_LABEL: Record<InspectionRecommendation["priority"], { label: string; className: string }> = {
  prompt: { label: "Prompt", className: "border-critical/30 bg-critical-soft text-critical" },
  planned: { label: "Planned", className: "border-attention/30 bg-attention-soft text-attention" },
  routine: { label: "Routine", className: "border-line-strong bg-canvas text-ink-2" },
};

const LEVEL_TITLE = { asset: "Asset intelligence", assembly: "Assembly intelligence", component: "Component intelligence" };

/** OBSERVED → DETECTED → INFERRED → CONFIRMED, always all four rows. */
function EvidenceLadder({ evidence, technicianConfirmed }: { evidence: ConditionEvidence[]; technicianConfirmed: boolean }) {
  return (
    <ol className="divide-y divide-line">
      {EVIDENCE_ORDER.map((level) => {
        const item = evidence.find((e) => e.level === level);
        return (
          <li key={level} className="flex gap-2.5 px-3 py-2">
            <EvidenceBadge level={level} unconfirmed={level === "confirmed" && !technicianConfirmed} />
            <div className="min-w-0 text-[13px] leading-snug">
              <p className={level === "inferred" ? "italic text-ink-2" : "text-ink"}>{item?.statement ?? "—"}</p>
              {item && <p className="mt-0.5 text-[11px] text-ink-3">{item.source}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ConditionCard({ condition, nodeName }: { condition: ActiveCondition; nodeName: string }) {
  return (
    <article className="rounded border border-line">
      <header className="flex items-start justify-between gap-2 border-b border-line bg-canvas/60 px-3 py-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold leading-snug text-ink">{condition.title}</h4>
          <div className="text-xs text-ink-3">{nodeName}</div>
        </div>
        <StatusBadge status={condition.status} size="sm" />
      </header>
      <EvidenceLadder evidence={condition.evidence} technicianConfirmed={condition.technicianConfirmed} />
    </article>
  );
}

/** Asset level: point at the highest-priority area and summarise why. */
function AssetOverview({
  model,
  conditions,
  onSelect,
}: {
  model: AssetModel;
  conditions: ActiveCondition[];
  onSelect: (id: string) => void;
}) {
  const area = priorityArea(model);
  const summary = model.assessment?.summary;

  return (
    <>
      <div className="space-y-3 border-t border-line px-4 py-4">
        <SectionLabel>Highest-priority area</SectionLabel>
        {area ? (
          <button
            type="button"
            onClick={() => onSelect(area.id)}
            className={`group flex w-full items-center justify-between gap-3 rounded border border-l-4 border-line px-3 py-2.5 text-left hover:bg-canvas ${STATUS_META[area.status].accent}`}
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{area.name}</span>
              <span className="block text-xs text-ink-3">Open {area.type} for detail</span>
            </span>
            <span className="flex items-center gap-2">
              <StatusBadge status={area.status} size="sm" />
              <ArrowRight size={15} className="text-ink-3 group-hover:text-ink" aria-hidden />
            </span>
          </button>
        ) : (
          <p className="text-sm text-ink-2">No area currently needs attention.</p>
        )}
        {summary && (
          <div className="rounded border border-line">
            <EvidenceLadder evidence={summary.evidence} technicianConfirmed={false} />
          </div>
        )}
      </div>

      {conditions.length > 0 && (
        <div className="space-y-2 border-t border-line px-4 py-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Active conditions</SectionLabel>
            <span className="font-mono text-xs tabular text-ink-3">{conditions.length}</span>
          </div>
          <ul className="space-y-1.5">
            {sortBySeverity(conditions).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.entityId)}
                  className="flex w-full items-center justify-between gap-2 rounded border border-line px-3 py-2 text-left hover:bg-canvas"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-ink">{c.title}</span>
                    <span className="block text-xs text-ink-3">{model.nodes[c.entityId]?.name}</span>
                  </span>
                  <StatusBadge status={c.status} size="sm" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function IntelligencePanel({
  model,
  selection,
  conditions,
  recommendations,
  onSelect,
}: {
  model: AssetModel;
  selection: Selection;
  conditions: ActiveCondition[];
  recommendations: InspectionRecommendation[];
  onSelect: (id: string) => void;
}) {
  const { node } = selection;
  const ordered = sortByPriority(recommendations);
  // Conditions on the selected node first, then those on its descendants.
  const scoped = [...conditions].sort((a, b) => Number(b.entityId === node.id) - Number(a.entityId === node.id));

  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow={LEVEL_TITLE[node.type]} title="Condition assessment" actions={<DemoBadge />} />
      <HealthSummary
        model={model}
        selection={selection}
        conditionCount={conditions.length}
        nextInspection={ordered[0] ?? null}
      />

      {node.type === "asset" ? (
        <AssetOverview model={model} conditions={conditions} onSelect={onSelect} />
      ) : (
        <div className="space-y-3 border-t border-line px-4 py-4">
          <div className="flex items-center justify-between">
            <SectionLabel>{conditions.length > 0 ? `Why ${node.name} needs attention` : "Active conditions"}</SectionLabel>
            <span className="font-mono text-xs tabular text-ink-3">{conditions.length}</span>
          </div>
          {scoped.length === 0 ? (
            <EmptyState title="No active conditions">
              No open findings for {node.name} in the demo dataset
              {node.status === "unknown" ? "; no recent inspection is on record" : ""}.
            </EmptyState>
          ) : (
            scoped.map((c) => <ConditionCard key={c.id} condition={c} nodeName={model.nodes[c.entityId]?.name ?? ""} />)
          )}
        </div>
      )}

      <p className="flex gap-1.5 border-t border-line px-4 py-3 text-[11px] leading-snug text-ink-3">
        <ShieldAlert size={13} className="mt-px shrink-0" aria-hidden />
        Based on simulated demo telemetry. Inferred statements are hypotheses for inspection planning, not
        diagnoses. Only technician-verified findings are marked confirmed.
      </p>

      <div className="space-y-3 border-t border-line px-4 py-4">
        <SectionLabel>Recommended inspection</SectionLabel>
        {ordered.length === 0 ? (
          <EmptyState title="No inspection recommended">Continue the routine maintenance schedule.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {ordered.map((r) => {
              const priority = PRIORITY_LABEL[r.priority];
              return (
                <li key={r.id} className="flex gap-2.5 rounded border border-line px-3 py-2.5">
                  <ClipboardCheck size={16} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${priority.className}`}
                      >
                        {priority.label}
                      </span>
                      <span className="text-xs text-ink-3">{model.nodes[r.entityId]?.name}</span>
                    </div>
                    <p className="mt-1 text-[13px] font-medium leading-snug text-ink">{r.action}</p>
                    <p className="mt-0.5 text-xs leading-snug text-ink-3">{r.rationale}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}
