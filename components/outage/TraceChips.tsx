import Link from "next/link";
import { Activity, Boxes, Cog, FileText, Gauge, ListTree, Wrench, type LucideIcon } from "lucide-react";
import type { TraceKind, TraceRef } from "@/types/outage";

const KIND: Record<TraceKind, { icon: LucideIcon; label: string }> = {
  asset: { icon: Cog, label: "Asset" },
  entity: { icon: Boxes, label: "Equipment" },
  signal: { icon: Activity, label: "Telemetry" },
  health_rule: { icon: Gauge, label: "Health engine" },
  service_event: { icon: Wrench, label: "Service record" },
  document: { icon: FileText, label: "Document" },
  bom: { icon: ListTree, label: "BOM" },
};

/** Compact list of the records a suggestion is based on. */
export function TraceChips({ trace }: { trace: TraceRef[] }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {trace.map((t, i) => {
        const { icon: Icon, label } = KIND[t.kind];
        const body = (
          <>
            <Icon size={11} className="shrink-0 text-ink-3" aria-hidden />
            <span className="sr-only">{label}: </span>
            <span className="truncate">{t.label}</span>
          </>
        );
        const className =
          "inline-flex max-w-full items-center gap-1 rounded border border-line bg-canvas px-1.5 py-0.5 text-[11px] text-ink-2";
        return (
          <li key={`${t.kind}-${i}`} className="max-w-full" title={`${label}: ${t.label}`}>
            {t.href ? (
              <Link href={t.href} className={`${className} hover:border-line-strong hover:text-ink`}>
                {body}
              </Link>
            ) : (
              <span className={className}>{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
