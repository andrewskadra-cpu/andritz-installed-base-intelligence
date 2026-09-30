import { DemoBadge } from "@/components/ui/DemoBadge";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

export function TopBar({ breadcrumbs }: { breadcrumbs: BreadcrumbItem[] }) {
  return (
    <header className="sticky top-0 z-20 flex print:hidden h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-panel/95 px-4 backdrop-blur lg:px-6">
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex shrink-0 items-center gap-3">
        <DemoBadge label="Demo environment" />
      </div>
    </header>
  );
}
