import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, Factory } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PlantHealthSummary } from "@/components/plant/PlantHealthSummary";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { HealthBar } from "@/components/ui/HealthBar";
import { KeyValue } from "@/components/ui/KeyValue";
import { SectionLabel } from "@/components/ui/Panel";
import {
  getAssetsForPlant,
  getConditionCounts,
  getCustomer,
  getPlantsForCustomer,
  getUnitsForPlant,
  summarizeHealth,
} from "@/lib/installed-base";

export async function generateMetadata({ params }: PageProps<"/customers/[customerId]">): Promise<Metadata> {
  const customer = await getCustomer((await params).customerId);
  return { title: customer?.name ?? "Customer not found" };
}

export default async function CustomerPage({ params }: PageProps<"/customers/[customerId]">) {
  const { customerId } = await params;
  const customer = await getCustomer(customerId);
  if (!customer) notFound();

  const plants = await getPlantsForCustomer(customer.id);
  const plantRows = await Promise.all(
    plants.map(async (plant) => {
      const [units, assets] = await Promise.all([getUnitsForPlant(plant.id), getAssetsForPlant(plant.id)]);
      return { plant, units, assets, health: summarizeHealth(assets.map((a) => a.status)) };
    }),
  );
  const allAssets = plantRows.flatMap((r) => r.assets);
  const conditionCounts = await getConditionCounts(allAssets.map((a) => a.id));
  const conditionTotal = Object.values(conditionCounts).reduce((a, b) => a + b, 0);

  return (
    <>
      <TopBar breadcrumbs={[{ label: "Installed base", href: "/" }, { label: customer.name }]} />
      <div className="border-b border-line bg-panel px-4 py-5 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded bg-navy-900 text-white">
              <Building2 size={20} aria-hidden />
            </span>
            <div>
              <div className="text-xs font-medium text-ink-3">Customer</div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{customer.name}</h1>
            </div>
          </div>
          {customer.isDemo && <DemoBadge />}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KeyValue label="Industry" value={customer.industry} />
          <KeyValue label="Region" value={customer.region} />
          <KeyValue label="Account" value={customer.accountManager} />
          <KeyValue label="Plants" value={plants.length} mono />
        </dl>
      </div>

      <main className="space-y-8 px-4 py-6 lg:px-8">
        <section>
          <SectionLabel>Installed-base health</SectionLabel>
          <div className="mt-3">
            <PlantHealthSummary
              summary={summarizeHealth(allAssets.map((a) => a.status))}
              conditionCount={conditionTotal}
            />
          </div>
        </section>

        <section>
          <SectionLabel>Plants</SectionLabel>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plantRows.map(({ plant, units, assets, health }) => (
              <Link
                key={plant.id}
                href={`/plants/${plant.id}`}
                className="group rounded-md border border-line bg-panel p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded bg-canvas text-ink-2">
                    <Factory size={18} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ink">{plant.name}</div>
                    <div className="truncate text-xs text-ink-3">
                      {plant.plantType} · {plant.location}
                    </div>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-3">
                  <KeyValue label="Units" value={units.map((u) => u.name).join(", ")} />
                  <KeyValue label="Assets" value={assets.length} mono />
                  <KeyValue label="Since" value={plant.commissioned} mono />
                </dl>
                <div className="mt-4">
                  <HealthBar summary={health} />
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-medium text-navy-700 group-hover:underline">
                  Open plant <ArrowRight size={13} aria-hidden />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
