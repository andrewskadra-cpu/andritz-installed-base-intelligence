"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, FileText, History, Package, ScanSearch } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { Panel } from "@/components/ui/Panel";
import { Tabs } from "@/components/ui/Tabs";
import {
  nodeName,
  resolveSelection,
  scopeChannels,
  scopeConditions,
  scopeDocuments,
  scopeParts,
  scopeRecommendations,
  scopeServiceEvents,
} from "@/lib/asset-selection";
import type { AssetContext } from "@/types/installed-base";
import { AssetHeader } from "./AssetHeader";
import { DocumentPanel } from "./DocumentPanel";
import { EquipmentHierarchy } from "./EquipmentHierarchy";
import { EquipmentViewer } from "./EquipmentViewer";
import { IntelligencePanel } from "./IntelligencePanel";
import { PartsPanel } from "./PartsPanel";
import { ServiceHistory } from "./ServiceHistory";
import { TelemetryPanel } from "./TelemetryPanel";

/**
 * Interactive asset intelligence screen. The selected hierarchy node lives in
 * the `?node=` search param so drill-down state is linkable and back-navigable.
 */
export function AssetWorkspace({ context }: { context: AssetContext }) {
  const searchParams = useSearchParams();
  const nodeId = searchParams.get("node");
  const { customer, plant, unit, asset } = context;

  const selection = useMemo(() => resolveSelection(context, nodeId), [context, nodeId]);
  const nameOf = useCallback((id: string) => nodeName(context, id), [context]);

  const select = useCallback((id: string | null) => {
    const url = id ? `?node=${encodeURIComponent(id)}` : window.location.pathname;
    window.history.pushState(null, "", url);
  }, []);

  const breadcrumbs: BreadcrumbItem[] = [
    { label: customer.name, href: `/customers/${customer.id}` },
    { label: plant.name, href: `/plants/${plant.id}` },
    { label: unit.name, href: `/plants/${plant.id}#${unit.id}` },
    ...selection.pathIds.map((id, i) => ({
      label: nameOf(id),
      onClick: () => select(i === 0 ? null : id),
    })),
  ];

  const scopeName = selection.name;
  const channels = scopeChannels(context, selection);
  const documents = scopeDocuments(context, selection);
  const parts = scopeParts(context, selection);

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <AssetHeader asset={asset} unit={unit} plant={plant} />

      <main
        className="grid items-start gap-4 p-4 md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-[auto_auto_1fr] md:[grid-template-areas:'tree_viewer'_'tree_intel'_'tree_tabs'] lg:p-6 xl:grid-cols-[260px_minmax(0,1fr)_360px] xl:grid-rows-[auto_1fr] xl:[grid-template-areas:'tree_viewer_intel'_'tree_tabs_intel']"
      >
        <div className="md:sticky md:top-18 md:[grid-area:tree]">
          <EquipmentHierarchy
            asset={asset}
            assemblies={context.assemblies}
            components={context.components}
            selection={selection}
            onSelect={select}
          />
        </div>

        <div className="min-w-0 md:[grid-area:viewer]">
          <EquipmentViewer
            assemblies={context.assemblies}
            components={context.components}
            selection={selection}
            onSelect={select}
          />
        </div>

        <div className="min-w-0 md:[grid-area:intel]">
          <IntelligencePanel
            selection={selection}
            conditions={scopeConditions(context, selection)}
            recommendations={scopeRecommendations(context, selection)}
            nodeName={nameOf}
          />
        </div>

        <Panel className="min-w-0 md:[grid-area:tabs]">
          <Tabs
            items={[
              {
                id: "condition",
                label: "Condition Data",
                icon: Activity,
                content: (
                  <TelemetryPanel
                    channels={channels}
                    readings={context.sensorReadings}
                    scopeName={scopeName}
                  />
                ),
              },
              {
                id: "drawing",
                label: "Drawing",
                icon: FileText,
                content: (
                  <DocumentPanel
                    documents={documents.filter((d) => d.kind === "drawing")}
                    scopeName={scopeName}
                    emptyLabel="drawings"
                  />
                ),
              },
              {
                id: "pi",
                label: "Interactive PI",
                icon: ScanSearch,
                content: (
                  <DocumentPanel
                    documents={documents.filter((d) => d.kind === "pi_sheet")}
                    parts={parts}
                    scopeName={scopeName}
                    emptyLabel="PI sheets"
                  />
                ),
              },
              {
                id: "service",
                label: "Service History",
                icon: History,
                content: (
                  <ServiceHistory
                    events={scopeServiceEvents(context, selection)}
                    scopeName={scopeName}
                    nodeName={nameOf}
                  />
                ),
              },
              {
                id: "parts",
                label: "Parts",
                icon: Package,
                content: <PartsPanel parts={parts} scopeName={scopeName} nodeName={nameOf} />,
              },
            ]}
          />
        </Panel>
      </main>
    </>
  );
}
