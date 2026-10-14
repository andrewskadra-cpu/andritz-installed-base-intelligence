"use client";

import { useId, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
}

/** Uncontrolled by default; pass `active` + `onChange` to control the open tab. */
export function Tabs({
  items,
  defaultTab,
  active: controlled,
  onChange,
}: {
  items: TabItem[];
  defaultTab?: string;
  active?: string;
  onChange?: (id: string) => void;
}) {
  const [internal, setInternal] = useState(defaultTab ?? items[0]?.id);
  const active = controlled ?? internal;
  const setActive = (id: string) => {
    setInternal(id);
    onChange?.(id);
  };
  const baseId = useId();
  const current = items.find((i) => i.id === active) ?? items[0];

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line bg-sunken/60 px-3 pt-2">
        {items.map((item) => {
          const selected = item.id === current.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              onClick={() => setActive(item.id)}
              className={`-mb-px flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm transition-all duration-200 ${
                selected
                  ? "border-accent bg-panel font-semibold text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]"
                  : "border-transparent font-medium text-ink-3 hover:bg-white/[0.03] hover:text-ink"
              }`}
            >
              {Icon && <Icon size={16} className={`hidden shrink-0 2xl:block ${selected ? "text-accent" : ""}`} aria-hidden />}
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${current.id}`}
        aria-labelledby={`${baseId}-tab-${current.id}`}
        className="p-5"
      >
        {current.content}
      </div>
    </div>
  );
}
