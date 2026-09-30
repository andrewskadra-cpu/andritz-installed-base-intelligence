"use client";

import { useId, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
}

export function Tabs({ items, defaultTab }: { items: TabItem[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);
  const baseId = useId();
  const current = items.find((i) => i.id === active) ?? items[0];

  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line px-2">
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
              className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                selected ? "border-navy-700 text-ink" : "border-transparent text-ink-3 hover:text-ink-2"
              }`}
            >
              {Icon && <Icon size={15} aria-hidden />}
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${current.id}`}
        aria-labelledby={`${baseId}-tab-${current.id}`}
        className="p-4"
      >
        {current.content}
      </div>
    </div>
  );
}
