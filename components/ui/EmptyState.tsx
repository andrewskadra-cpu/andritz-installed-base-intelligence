import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong bg-sunken/70 px-5 py-8 text-center">
      <p className="text-sm font-medium text-ink-2">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-xs text-ink-3">{children}</p>}
    </div>
  );
}
