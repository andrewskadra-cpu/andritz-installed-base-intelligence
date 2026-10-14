import { FlaskConical } from "lucide-react";

export function DemoBadge({ label = "Demo data" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-raised px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-2">
      <FlaskConical size={12} strokeWidth={2.25} className="text-cyan" aria-hidden />
      {label}
    </span>
  );
}
