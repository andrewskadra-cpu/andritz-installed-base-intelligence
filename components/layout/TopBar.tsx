import { SearchTrigger } from "@/components/search/SearchTrigger";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

export function TopBar({ breadcrumbs }: { breadcrumbs: BreadcrumbItem[] }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-white/[0.06] bg-canvas/80 px-4 backdrop-blur-xl backdrop-saturate-150 print:hidden lg:px-8">
      <div className="min-w-0 flex-1">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <div className="hidden w-[min(28rem,34vw)] shrink-0 md:block">
        <SearchTrigger />
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <DemoBadge label="Demo environment" />
      </div>
    </header>
  );
}
