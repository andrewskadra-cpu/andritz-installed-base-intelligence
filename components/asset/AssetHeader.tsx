import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { BuildOutageScopeButton, outageScopeHref } from "@/components/outage/BuildOutageScopeButton";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import type { AssetModel } from "@/lib/asset-model";
import { partsSupportHref } from "@/lib/parts/part-context";

/** Compact identity band: name, status and the key identifiers on one line, actions on the right. */
export function AssetHeader({ model }: { model: AssetModel }) {
  const { asset, unit, plant } = model.records;
  const facts: { label: string; value: string; mono?: boolean }[] = [
    { label: "Model", value: asset.model, mono: true },
    { label: "Serial", value: asset.serialNumber, mono: true },
    { label: "Plant", value: plant.name },
    { label: "Unit", value: unit.name },
    { label: "Position", value: asset.installedPosition },
    { label: "Installed", value: formatDate(asset.installedDate), mono: true },
  ];
  return (
    <div className="page-band px-4 py-3 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-ink-3">
            {asset.productLine} · {asset.equipmentType}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-3">
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-ink">{asset.name}</h1>
            <StatusBadge status={model.nodes[model.rootId].status} size="lg" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DemoBadge />
          <Link
            href={partsSupportHref("", { assetId: asset.id, entityId: null })}
            className="btn-secondary whitespace-nowrap px-3.5 py-2 text-sm print:hidden"
          >
            <LifeBuoy size={15} aria-hidden /> Parts &amp; Support
          </Link>
          <BuildOutageScopeButton href={outageScopeHref(plant.id, unit.id, asset.id)} label={`Build Draft Outage Scope · ${unit.name}`} />
        </div>
      </div>
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1.5 text-sm">
        {facts.map((f) => (
          <div key={f.label} className="flex items-baseline gap-2">
            <dt className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">{f.label}</dt>
            <dd className={`font-medium text-ink ${f.mono ? "font-mono tabular" : ""}`}>{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
