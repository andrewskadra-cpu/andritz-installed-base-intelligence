import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import {
  InstalledBaseExplorer,
  type ExplorerRow,
  type ExplorerTreeCustomer,
} from "@/components/installed-base/InstalledBaseExplorer";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { getPortfolio } from "@/lib/installed-base";

export const metadata: Metadata = { title: "Installed Base" };

export default async function InstalledBasePage({ searchParams }: PageProps<"/installed-base">) {
  const sp = await searchParams;
  const p = await getPortfolio();

  const tree: ExplorerTreeCustomer[] = p.customers.map((c) => ({
    id: c.id,
    name: c.name,
    plants: p.plants
      .filter((pl) => pl.customerId === c.id)
      .map((pl) => ({
        id: pl.id,
        name: pl.name,
        location: pl.location,
        units: p.units.filter((u) => u.plantId === pl.id).map((u) => ({ id: u.id, name: u.name, unitType: u.unitType })),
      })),
  }));

  const rows: ExplorerRow[] = p.assets.map(({ summary, customer, plant, unit }) => ({
    id: summary.asset.id,
    name: summary.asset.name,
    model: summary.asset.model,
    serialNumber: summary.asset.serialNumber,
    equipmentType: summary.asset.equipmentType,
    position: summary.asset.installedPosition,
    status: summary.status,
    conditionCount: summary.conditionCount,
    topConcern: summary.topConcern ? `${summary.topConcern.condition.title} · ${summary.topConcern.nodeName}` : null,
    lastService: summary.lastService,
    cycles: summary.cycles,
    customer: { id: customer.id, name: customer.name },
    plant: { id: plant.id, name: plant.name, location: plant.location },
    unit: { id: unit.id, name: unit.name },
  }));

  // ?customer= / ?plant= / ?unit= open the explorer already scoped (e.g. from a breadcrumb or link).
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const initialScope = pick("unit")
    ? ({ level: "unit", id: pick("unit")! } as const)
    : pick("plant")
      ? ({ level: "plant", id: pick("plant")! } as const)
      : pick("customer")
        ? ({ level: "customer", id: pick("customer")! } as const)
        : ({ level: "all" } as const);

  return (
    <>
      <TopBar breadcrumbs={[{ label: "Installed Base" }]} />
      <div className="page-band px-4 py-7 lg:px-10">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow text-cyan">Installed Base</div>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">Explore the installed base</h1>
            <p className="mt-2 max-w-3xl text-base text-ink-2">
              Browse customer, plant and unit, then open any equipment in its intelligence workspace.
            </p>
          </div>
          <DemoBadge />
        </div>
      </div>
      <main className="mx-auto w-full max-w-[1600px] animate-enter px-4 py-8 lg:px-10">
        <InstalledBaseExplorer tree={tree} rows={rows} initialScope={initialScope} />
      </main>
    </>
  );
}
