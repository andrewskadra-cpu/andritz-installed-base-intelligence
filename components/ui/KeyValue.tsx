import type { ReactNode } from "react";

export function KeyValue({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3">{label}</dt>
      <dd className={`mt-0.5 truncate text-sm font-medium text-ink ${mono ? "font-mono tabular" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
