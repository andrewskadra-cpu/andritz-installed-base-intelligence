import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded border border-dashed border-line-strong bg-canvas/60 px-4 py-6 text-center">
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {children && <p className="mt-1 text-xs text-ink-3">{children}</p>}
    </div>
  );
}
