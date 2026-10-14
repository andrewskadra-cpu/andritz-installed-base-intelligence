"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  History,
  ListChecks,
  Microscope,
  ShieldAlert,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { BuildOutageScopeButton } from "@/components/outage/BuildOutageScopeButton";
import { AssetPartsInquiry } from "@/components/parts-support/AssetPartsInquiry";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import { formatDate } from "@/lib/format";
import { nodeMetrics, priorityArea, sortByPriority, sortBySeverity, type AssetModel } from "@/lib/asset-model";
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
  prompt: { label: "Earliest opportunity", className: "border-critical/30 bg-critical-soft text-critical" },
  planned: { label: "Next planned outage", className: "border-attention/30 bg-attention-soft text-attention" },
  routine: { label: "Routine", className: "border-line-strong bg-raised text-ink-2" },
};

const LEVEL_TITLE = { asset: "Asset intelligence", assembly: "Assembly intelligence", component: "Component intelligence" };

/** Engineering document behind the selected node, with a direct route into the document workspace. */
export interface EngineeringRefSummary {
  label: string;
  title: string;
}

/** Collapsible section with a lettered heading (A–E). */
function Section({
  letter,
  title,
  icon: Icon,
  count,
  defaultOpen = true,
  children,
}: {
  letter: string;
  title: string;
  icon: LucideIcon;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `intel-${letter}`;
  return (
    <section className="border-t border-line">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-raised font-mono text-2xs font-semibold text-ink-2">
            {letter}
          </span>
          <Icon size={16} className="shrink-0 text-accent" aria-hidden />
          <span className="flex-1 text-sm font-semibold text-ink">{title}</span>
          {count !== undefined && <span className="font-mono text-xs tabular text-ink-3">{count}</span>}
          <ChevronDown size={16} className={`shrink-0 text-ink-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
      </h3>
      {open && (
        <div id={id} className="animate-fade space-y-3 px-5 pb-5">
          {children}
        </div>
      )}
    </section>
  );
}

/** OBSERVED → DETECTED → INFERRED → CONFIRMED, always all four rows. */
function EvidenceLadder({ evidence, technicianConfirmed }: { evidence: ConditionEvidence[]; technicianConfirmed: boolean }) {
  return (
    <ol className="divide-y divide-line">
      {EVIDENCE_ORDER.map((level) => {
        const item = evidence.find((e) => e.level === level);
        return (
          <li key={level} className="flex gap-3 px-3.5 py-2.5">
            <EvidenceBadge level={level} unconfirmed={level === "confirmed" && !technicianConfirmed} />
            <div className="min-w-0 text-sm leading-snug">
              <p className={level === "inferred" ? "italic text-ink-2" : "text-ink"}>{item?.statement ?? "–"}</p>
              {item && <p className="mt-0.5 text-xs text-ink-3">{item.source}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** B: the condition headline with its DETECTED basis only. */
function KeyEvidence({
  condition,
  nodeName,
  onSelect,
  current,
}: {
  condition: ActiveCondition;
  nodeName: string;
  onSelect: (id: string) => void;
  current: boolean;
}) {
  const detected = condition.evidence.find((e) => e.level === "detected");
  return (
    <div className={`rounded-xl border border-l-4 border-line bg-sunken/50 px-4 py-3 ${STATUS_META[condition.status].accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-snug text-ink">{condition.title}</div>
          {current ? (
            <div className="text-xs text-ink-3">{nodeName}</div>
          ) : (
            <button type="button" onClick={() => onSelect(condition.entityId)} className="text-xs font-medium text-accent hover:underline">
              {nodeName}
            </button>
          )}
        </div>
        <StatusBadge status={condition.status} size="sm" />
      </div>
      {detected && (
        <div className="mt-2.5 flex gap-2.5 text-sm text-ink-2">
          <EvidenceBadge level="detected" />
          <span className="min-w-0">{detected.statement}</span>
        </div>
      )}
      <p className="mt-2 text-xs text-ink-3">
        {condition.technicianConfirmed ? "Technician-confirmed finding on record." : "No technician-confirmed failure on record."}
      </p>
    </div>
  );
}

export function IntelligencePanel({
  model,
  selection,
  conditions,
  recommendations,
  onSelect,
  engineeringReference = null,
  onOpenEngineeringReference,
  onOpenServiceHistory,
  outageHref,
  fill = false,
}: {
  model: AssetModel;
  selection: Selection;
  conditions: ActiveCondition[];
  recommendations: InspectionRecommendation[];
  onSelect: (id: string | null) => void;
  engineeringReference?: EngineeringRefSummary | null;
  onOpenEngineeringReference?: () => void;
  onOpenServiceHistory?: () => void;
  outageHref?: string;
  /** Fill the parent's height: sections scroll inside the panel, header and safeguard notice stay in view. */
  fill?: boolean;
}) {
  const { node } = selection;
  const ordered = sortByPriority(recommendations);
  // Conditions on the selected node first, then those on its descendants; most severe first within each.
  const scoped = sortBySeverity([...conditions]).sort((a, b) => Number(b.entityId === node.id) - Number(a.entityId === node.id));
  const area = node.type === "asset" ? priorityArea(model) : null;
  const metrics = nodeMetrics(model, node.id);

  return (
    <section
      className={`overflow-hidden rounded-xl border border-line bg-panel shadow-panel ${fill ? "flex h-full min-h-0 flex-col" : ""}`}
      aria-label="Condition intelligence"
    >
      <header className={`flex items-center justify-between gap-3 px-5 py-3.5 ${fill ? "shrink-0 border-b border-line" : ""}`}>
        <div className="min-w-0">
          <div className="eyebrow">{LEVEL_TITLE[node.type]}</div>
          <h2 className="text-base font-semibold tracking-tight text-ink">Condition assessment</h2>
        </div>
        <DemoBadge />
      </header>

      <div className={fill ? "-mt-px min-h-0 flex-1 overflow-y-auto overscroll-contain" : ""} data-testid="intel-body">
        {/* A. Selected component & health */}
        <Section letter="A" title="Selected component & health" icon={Stethoscope}>
          <div className="-mx-5 -mb-2">
            <HealthSummary model={model} selection={selection} conditionCount={conditions.length} nextInspection={ordered[0] ?? null} />
          </div>
        </Section>

        {/* B. Key condition evidence */}
        <Section letter="B" title="Key condition evidence" icon={Microscope} count={scoped.length}>
          {area && (
            <button
              type="button"
              onClick={() => onSelect(area.id)}
              className={`group flex w-full items-center justify-between gap-3 rounded-xl border border-l-4 border-line px-4 py-3 text-left transition-colors hover:bg-raised/70 ${STATUS_META[area.status].accent}`}
            >
              <span className="min-w-0">
                <span className="eyebrow">Highest-priority area</span>
                <span className="block text-base font-semibold text-ink">{area.name}</span>
              </span>
              <span className="flex items-center gap-2">
                <StatusBadge status={area.status} size="sm" />
                <ArrowRight size={15} className="text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
              </span>
            </button>
          )}
          {scoped.length === 0 ? (
            <EmptyState title="No active conditions">
              No open findings for {node.name} in the demo dataset
              {node.status === "unknown" ? "; no recent inspection is on record" : ""}.
            </EmptyState>
          ) : (
            scoped.map((c) => (
              <KeyEvidence
                key={c.id}
                condition={c}
                nodeName={model.nodes[c.entityId]?.name ?? ""}
                onSelect={onSelect}
                current={c.entityId === node.id}
              />
            ))
          )}
        </Section>

        {/* C. Suggested next actions */}
        <Section letter="C" title="Suggested next actions" icon={ListChecks} count={ordered.length}>
          {ordered.length === 0 ? (
            <EmptyState title="No inspection considerations">Nothing suggested beyond the routine maintenance schedule.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {ordered.map((r) => {
                const priority = PRIORITY_LABEL[r.priority];
                return (
                  <li key={r.id} className="flex gap-3 rounded-xl border border-line px-4 py-3">
                    <ClipboardCheck size={17} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2 py-px text-2xs font-semibold uppercase tracking-wide ${priority.className}`}>
                          {priority.label}
                        </span>
                        <span className="text-xs text-ink-3">{model.nodes[r.entityId]?.name}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-medium leading-snug text-ink">{r.action}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-3">{r.rationale}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {outageHref && ordered.length > 0 && (
            <BuildOutageScopeButton href={outageHref} variant="secondary" className="w-full py-2.5" />
          )}
          <AssetPartsInquiry model={model} selection={selection} hasCondition={conditions.length > 0} embedded />
        </Section>

        {/* D. Detailed reasoning */}
        <Section
          letter="D"
          title="Detailed reasoning"
          icon={ShieldAlert}
          count={node.type === "asset" ? undefined : scoped.length}
        >
          <p className="text-xs leading-relaxed text-ink-3">
            Observed values, rule detections, possible explanations and technician confirmation, kept separate. Inferred statements are
            hypotheses, not diagnoses.
          </p>
          {node.type === "asset" && model.assessment?.summary && (
            <div className="overflow-hidden rounded-xl border border-line">
              <div className="border-b border-line bg-sunken/70 px-3.5 py-2 text-sm font-semibold text-ink">Asset-level summary</div>
              <EvidenceLadder evidence={model.assessment.summary.evidence} technicianConfirmed={false} />
            </div>
          )}
          {scoped.map((c) => (
            <article key={c.id} className="overflow-hidden rounded-xl border border-line">
              <header className="flex items-start justify-between gap-2 border-b border-line bg-sunken/70 px-3.5 py-2.5">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold leading-snug text-ink">{c.title}</h4>
                  <div className="text-xs text-ink-3">{model.nodes[c.entityId]?.name}</div>
                </div>
                <StatusBadge status={c.status} size="sm" />
              </header>
              <EvidenceLadder evidence={c.evidence} technicianConfirmed={c.technicianConfirmed} />
            </article>
          ))}
          {node.type !== "asset" && scoped.length === 0 && <p className="text-sm text-ink-2">No condition reasoning to show for {node.name}.</p>}
        </Section>

        {/* E. Engineering / service context */}
        <Section letter="E" title="Engineering & service context" icon={BookOpen}>
          {engineeringReference ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-mono text-sm font-semibold text-ink">
                  <BookOpen size={15} className="shrink-0 text-info" aria-hidden />
                  {engineeringReference.label}
                </div>
                <div className="mt-0.5 text-xs text-ink-3">{engineeringReference.title}</div>
              </div>
              {onOpenEngineeringReference && (
                <button type="button" onClick={onOpenEngineeringReference} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                  Open drawing <ArrowRight size={13} aria-hidden />
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-2">No interactive engineering drawing item is mapped to {node.name}.</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
            <div className="min-w-0 text-sm">
              <div className="flex items-center gap-1.5 font-semibold text-ink">
                <History size={15} className="text-ink-3" aria-hidden /> Service record
              </div>
              <div className="mt-0.5 text-xs text-ink-3">
                Last service <span className="font-mono text-ink-2">{formatDate(metrics.lastService?.date ?? null)}</span> · last inspection{" "}
                <span className="font-mono text-ink-2">{formatDate(metrics.lastInspection?.date ?? null)}</span>
              </div>
            </div>
            {onOpenServiceHistory && (
              <button type="button" onClick={onOpenServiceHistory} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
                Service history <ArrowRight size={13} aria-hidden />
              </button>
            )}
          </div>
        </Section>

        <p className="flex gap-2 border-t border-line bg-sunken/70 px-5 py-3 text-xs leading-relaxed text-ink-3">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
          Suggestions are based on simulated demo telemetry for planning support only. Inferred statements are possible explanations,
          not diagnoses. Only technician-verified findings are marked confirmed.
        </p>
      </div>
    </section>
  );
}
