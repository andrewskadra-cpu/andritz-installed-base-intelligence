import { FlaskConical } from "lucide-react";

export function DemoBadge({ label = "Demo data" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-info/30 bg-info-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-info">
      <FlaskConical size={11} strokeWidth={2.25} aria-hidden />
      {label}
    </span>
  );
}
