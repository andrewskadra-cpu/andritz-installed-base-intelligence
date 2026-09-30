import { ClipboardCheck, ShieldAlert } from "lucide-react";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Panel, PanelHeader, SectionLabel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { SelectedNode } from "@/lib/asset-selection";
import type { ActiveCondition, EvidenceLevel, InspectionRecommendation } from "@/types/installed-base";
import { HealthSummary } from "./HealthSummary";

const EVIDENCE_ORDER: EvidenceLevel[] = ["observed", "detected", "inferred", "confirmed"];

const PRIORITY_LABEL: Record<InspectionRecommendation["priority"], { label: string; className: string }> = {
  prompt: { label: "Prompt", className: "border-critical/30 bg-critical-soft text-critical" },
  planned: { label: "Planned", className: "border-attention/30 bg-attention-soft text-attention" },
  routine: { label: "Routine", className: "border-line-strong bg-canvas text-ink-2" },
};

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
      <ol className="divide-y divide-line">
        {EVIDENCE_ORDER.map((level) => {
          const item = condition.evidence.find((e) => e.level === level);
          const unconfirmed = level === "confirmed" && !condition.technicianConfirmed;
          return (
            <li key={level} className="flex gap-2.5 px-3 py-2">
              <EvidenceBadge level={level} unconfirmed={unconfirmed} />
              <div className="min-w-0 text-[13px] leading-snug">
                <p className={level === "inferred" ? "italic text-ink-2" : "text-ink"}>
                  {item?.statement ?? "—"}
                </p>
                {item && <p className="mt-0.5 text-[11px] text-ink-3">{item.source}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </article>
  );
}

export function IntelligencePanel({
  selection,
  conditions,
  recommendations,
  nodeName,
}: {
  selection: SelectedNode;
  conditions: ActiveCondition[];
  recommendations: InspectionRecommendation[];
  nodeName: (id: string) => string;
}) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader eyebrow="Asset intelligence" title="Condition assessment" actions={<DemoBadge />} />
      <HealthSummary selection={selection} />

      <div className="space-y-3 border-t border-line px-4 py-4">
        <div className="flex items-center justify-between">
          <SectionLabel>Active conditions</SectionLabel>
          <span className="font-mono text-xs tabular text-ink-3">{conditions.length}</span>
        </div>
        {conditions.length === 0 ? (
          <EmptyState title="No active conditions">No open findings at this level in the demo dataset.</EmptyState>
        ) : (
          conditions.map((c) => <ConditionCard key={c.id} condition={c} nodeName={nodeName(c.targetId)} />)
        )}
        {conditions.length > 0 && (
          <p className="flex gap-1.5 text-[11px] leading-snug text-ink-3">
            <ShieldAlert size={13} className="mt-px shrink-0" aria-hidden />
            Inferred statements are hypotheses for inspection planning, not diagnoses. Only technician-verified
            findings are marked confirmed.
          </p>
        )}
      </div>

      <div className="space-y-3 border-t border-line px-4 py-4">
        <SectionLabel>Recommended inspection</SectionLabel>
        {recommendations.length === 0 ? (
          <EmptyState title="No inspection recommended">Continue routine maintenance schedule.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {recommendations.map((r) => {
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
                      <span className="text-xs text-ink-3">{nodeName(r.targetId)}</span>
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
