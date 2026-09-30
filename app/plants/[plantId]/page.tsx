import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowDown, Flame } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { AssetList } from "@/components/plant/AssetList";
import { PlantHeader } from "@/components/plant/PlantHeader";
import { PlantHealthSummary } from "@/components/plant/PlantHealthSummary";
import { HealthBar } from "@/components/ui/HealthBar";
import { SectionLabel } from "@/components/ui/Panel";
import { sortBySeverity } from "@/lib/asset-model";
import {
  getCustomer,
  getPlant,
  getPlantAssetSummaries,
  getUnitsForPlant,
  summarizeHealth,
} from "@/lib/installed-base";

export async function generateMetadata({ params }: PageProps<"/plants/[plantId]">): Promise<Metadata> {
  const plant = await getPlant((await params).plantId);
  return { title: plant?.name ?? "Plant not found" };
}

export default async function PlantPage({ params }: PageProps<"/plants/[plantId]">) {
  const { plantId } = await params;
  const plant = await getPlant(plantId);
  if (!plant) notFound();
  const customer = await getCustomer(plant.customerId);
  if (!customer) notFound();

  const [units, summaries] = await Promise.all([getUnitsForPlant(plant.id), getPlantAssetSummaries(plant.id)]);
  const conditionTotal = summaries.reduce((n, s) => n + s.conditionCount, 0);
  // Most severe first; serial order within the same status.
  const unitAssets = (unitId: string) =>
    sortBySeverity(
      summaries
        .filter((s) => s.asset.unitId === unitId)
        .sort((a, b) => a.asset.serialNumber.localeCompare(b.asset.serialNumber)),
    );

  return (
    <>
      <TopBar
        breadcrumbs={[
          { label: customer.name, href: `/customers/${customer.id}` },
          { label: plant.name },
        ]}
      />
      <PlantHeader plant={plant} customer={customer} unitCount={units.length} assetCount={summaries.length} />

      <main className="space-y-8 px-4 py-6 lg:px-8">
        <section>
          <SectionLabel>Plant health · derived from demo telemetry</SectionLabel>
          <div className="mt-3">
            <PlantHealthSummary summary={summarizeHealth(summaries.map((s) => s.status))} conditionCount={conditionTotal} />
          </div>
        </section>

        <section>
          <SectionLabel>Plant units</SectionLabel>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {units.map((unit) => {
              const assets = unitAssets(unit.id);
              return (
                <a
                  key={unit.id}
                  href={`#${unit.id}`}
                  className="group rounded-md border border-line bg-panel p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Flame size={18} className="text-ink-2" aria-hidden />
                      <span className="font-semibold text-ink">{unit.name}</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-navy-700 group-hover:underline">
                      {assets.length} assets <ArrowDown size={13} aria-hidden />
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-3">{unit.description}</p>
                  <div className="mt-3">
                    <HealthBar summary={summarizeHealth(assets.map((a) => a.status))} />
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        {units.map((unit) => {
          const assets = unitAssets(unit.id);
          return (
            <section key={unit.id} id={unit.id} className="scroll-mt-20">
              <div className="mb-3 flex flex-wrap items-baseline gap-2">
                <Flame size={18} className="self-center text-ink-2" aria-hidden />
                <h2 className="text-lg font-semibold text-ink">{unit.name}</h2>
                <span className="text-sm text-ink-3">
                  · {unit.unitType} · {assets.length} tracked {assets.length === 1 ? "asset" : "assets"}
                </span>
              </div>
              <AssetList assets={assets} />
            </section>
          );
        })}
      </main>
    </>
  );
}
