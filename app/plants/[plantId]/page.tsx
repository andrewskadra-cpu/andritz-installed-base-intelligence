import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Flame } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { AssetList } from "@/components/plant/AssetList";
import { PlantHeader } from "@/components/plant/PlantHeader";
import { PlantHealthSummary } from "@/components/plant/PlantHealthSummary";
import { SectionLabel } from "@/components/ui/Panel";
import {
  getAssetsForUnits,
  getConditionCounts,
  getCustomer,
  getPlant,
  getUnitsForPlant,
  summarizeHealth,
} from "@/lib/installed-base";
import type { HealthStatus } from "@/types/installed-base";

const SEVERITY: Record<HealthStatus, number> = { critical: 0, attention: 1, unknown: 2, healthy: 3 };

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

  const units = await getUnitsForPlant(plant.id);
  const assets = await getAssetsForUnits(units.map((u) => u.id));
  const conditionCounts = await getConditionCounts(assets.map((a) => a.id));
  const conditionTotal = Object.values(conditionCounts).reduce((a, b) => a + b, 0);

  return (
    <>
      <TopBar
        breadcrumbs={[
          { label: customer.name, href: `/customers/${customer.id}` },
          { label: plant.name },
        ]}
      />
      <PlantHeader plant={plant} customer={customer} unitCount={units.length} />

      <main className="space-y-8 px-4 py-6 lg:px-8">
        <section>
          <SectionLabel>Plant health</SectionLabel>
          <div className="mt-3">
            <PlantHealthSummary
              summary={summarizeHealth(assets.map((a) => a.status))}
              conditionCount={conditionTotal}
            />
          </div>
        </section>

        {units.map((unit) => {
          const unitAssets = assets
            .filter((a) => a.unitId === unit.id)
            .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status] || a.serialNumber.localeCompare(b.serialNumber));
          return (
            <section key={unit.id} id={unit.id} className="scroll-mt-20">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-ink-2" aria-hidden />
                  <h2 className="text-lg font-semibold text-ink">{unit.name}</h2>
                  <span className="text-sm text-ink-3">
                    · {unitAssets.length} tracked {unitAssets.length === 1 ? "asset" : "assets"}
                  </span>
                </div>
                <span className="hidden text-xs text-ink-3 sm:block">{unit.description}</span>
              </div>
              <AssetList assets={unitAssets} conditionCounts={conditionCounts} />
            </section>
          );
        })}
      </main>
    </>
  );
}
