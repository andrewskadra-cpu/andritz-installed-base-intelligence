import { Factory } from "lucide-react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { KeyValue } from "@/components/ui/KeyValue";
import type { Customer, Plant } from "@/types/installed-base";

export function PlantHeader({ plant, customer, unitCount }: { plant: Plant; customer: Customer; unitCount: number }) {
  return (
    <div className="border-b border-line bg-panel px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded bg-navy-900 text-white">
            <Factory size={20} aria-hidden />
          </span>
          <div>
            <div className="text-xs font-medium text-ink-3">{customer.name}</div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{plant.name}</h1>
          </div>
        </div>
        <DemoBadge />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KeyValue label="Plant type" value={plant.plantType} />
        <KeyValue label="Location" value={plant.location} />
        <KeyValue label="Commissioned" value={plant.commissioned} mono />
        <KeyValue label="Units" value={unitCount} mono />
      </dl>
    </div>
  );
}
