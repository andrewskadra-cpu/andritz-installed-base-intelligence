import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { OutageScopeView } from "@/components/outage/OutageScopeView";
import { getOutageScopeData, getPlant } from "@/lib/installed-base";

export async function generateMetadata({ params }: PageProps<"/plants/[plantId]/outage-scope">): Promise<Metadata> {
  const plant = await getPlant((await params).plantId);
  return { title: plant ? `Outage scope · ${plant.name}` : "Outage scope" };
}

export default async function OutageScopePage({ params, searchParams }: PageProps<"/plants/[plantId]/outage-scope">) {
  const { plantId } = await params;
  const unitParam = (await searchParams).unit;
  const unitId = typeof unitParam === "string" ? unitParam : null;

  const data = await getOutageScopeData(plantId, unitId);
  if (!data) notFound();
  const { customer, plant, units } = data;

  return (
    <>
      <TopBar
        breadcrumbs={[
          { label: customer.name, href: `/customers/${customer.id}` },
          { label: plant.name, href: `/plants/${plant.id}` },
          ...(unitId ? units.map((u) => ({ label: u.name, href: `/plants/${plant.id}#${u.id}` })) : []),
          { label: "Outage scope" },
        ]}
      />
      <OutageScopeView {...data} />
    </>
  );
}
