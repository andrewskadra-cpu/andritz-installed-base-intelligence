import { Eye, Lightbulb, Radar, ShieldCheck, ShieldQuestion, type LucideIcon } from "lucide-react";
import type { EvidenceLevel } from "@/types/installed-base";

export const EVIDENCE_META: Record<
  EvidenceLevel,
  { label: string; icon: LucideIcon; hint: string; className: string }
> = {
  observed: {
    label: "Observed",
    icon: Eye,
    hint: "Raw measured value",
    className: "border-line-strong bg-panel text-ink-2",
  },
  detected: {
    label: "Detected",
    icon: Radar,
    hint: "Rule or baseline comparison",
    className: "border-info/30 bg-info-soft text-info",
  },
  inferred: {
    label: "Inferred",
    icon: Lightbulb,
    hint: "Hypothesis — not a diagnosis",
    className: "border-dashed border-ink-3 bg-panel text-ink-2",
  },
  confirmed: {
    label: "Confirmed",
    icon: ShieldCheck,
    hint: "Technician-verified finding",
    className: "border-healthy/30 bg-healthy-soft text-healthy",
  },
};

/**
 * Evidence-level tag. A "confirmed" row without technician confirmation renders
 * greyed out so it can never be mistaken for a verified failure.
 */
export function EvidenceBadge({ level, unconfirmed = false }: { level: EvidenceLevel; unconfirmed?: boolean }) {
  const meta = EVIDENCE_META[level];
  const isOpen = level === "confirmed" && unconfirmed;
  const Icon = isOpen ? ShieldQuestion : meta.icon;
  const className = isOpen ? "border-line-strong bg-canvas text-ink-3" : meta.className;
  return (
    <span
      title={meta.hint}
      className={`inline-flex w-[94px] shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em] ${className}`}
    >
      <Icon size={11} strokeWidth={2.25} aria-hidden />
      {meta.label}
    </span>
  );
}
