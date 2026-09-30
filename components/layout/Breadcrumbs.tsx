import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  /** Client-side handler, used for in-page drill-down levels. */
  onClick?: () => void;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          const className = last
            ? "font-semibold text-ink"
            : "text-ink-3 hover:text-ink hover:underline underline-offset-2";
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight size={14} className="shrink-0 text-line-strong" aria-hidden />}
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
        })}
      </ol>
    </nav>
  );
}
