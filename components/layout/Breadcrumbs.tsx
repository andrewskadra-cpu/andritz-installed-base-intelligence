import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  /** Client-side handler, used for in-page drill-down levels. */
  onClick?: () => void;
}

/**
 * Single-line breadcrumb trail. Long trails keep the first crumb and the last
 * two readable and fold the middle into "…" below 2xl widths (the full path is
 * in the ellipsis tooltip and every level stays reachable in the page itself).
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const fold = items.length > 4;
  const hidden = items.slice(1, -2).map((i) => i.label).join(" › ");
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 flex-nowrap items-center gap-x-1 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          const middle = fold && index > 0 && index < items.length - 2;
          const className = last ? "font-semibold text-ink" : "text-ink-3 transition-colors hover:text-ink";
          const crumb = (
            <li
              key={`${item.label}-${index}`}
              title={item.label}
              className={`min-w-0 items-center gap-1 ${middle ? "hidden 2xl:flex" : "flex"} ${last ? "shrink-0 max-w-[40%]" : "shrink"}`}
            >
              {index > 0 && <ChevronRight size={14} className="shrink-0 text-ink-3/50" aria-hidden />}
              {last ? (
                <span aria-current="page" className={`truncate ${className}`}>
                  {item.label}
                </span>
              ) : item.onClick ? (
                <button type="button" onClick={item.onClick} className={`truncate ${className}`}>
                  {item.label}
                </button>
              ) : item.href ? (
                <Link href={item.href} className={`truncate ${className}`}>
                  {item.label}
                </Link>
              ) : (
                <span className="truncate text-ink-3">{item.label}</span>
              )}
            </li>
          );
          if (!(fold && index === 0)) return crumb;
          return [
            crumb,
            <li key="fold" className="flex shrink-0 items-center gap-1 2xl:hidden" title={hidden}>
              <ChevronRight size={14} className="shrink-0 text-ink-3/50" aria-hidden />
              <span className="px-1 text-ink-3">
                …<span className="sr-only">{hidden}</span>
              </span>
            </li>,
          ];
        })}
      </ol>
    </nav>
  );
}
