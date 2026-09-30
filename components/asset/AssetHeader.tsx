import { DemoBadge } from "@/components/ui/DemoBadge";
import { KeyValue } from "@/components/ui/KeyValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import type { AssetModel } from "@/lib/asset-model";

export function AssetHeader({ model }: { model: AssetModel }) {
  const { asset, unit, plant } = model.records;
  return (
    <div className="border-b border-line bg-panel px-4 py-4 lg:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-ink-3">
            {asset.productLine} · {asset.equipmentType}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{asset.name}</h1>
            <StatusBadge status={model.nodes[model.rootId].status} size="lg" />
          </div>
        </div>
        <DemoBadge />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
        <KeyValue label="Model" value={asset.model} mono />
        <KeyValue label="Serial number" value={asset.serialNumber} mono />
        <KeyValue label="Plant" value={plant.name} />
        <KeyValue label="Unit" value={unit.name} />
        <KeyValue label="Position" value={asset.installedPosition} />
        <KeyValue label="Installed" value={formatDate(asset.installedDate)} mono />
      </dl>
    </div>
  );
}
