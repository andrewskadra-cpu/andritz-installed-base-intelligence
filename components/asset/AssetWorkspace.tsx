"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, FileText, History, Package, ScanSearch } from "lucide-react";
import { InteractivePIViewer } from "@/components/pi/InteractivePIViewer";
import { TopBar } from "@/components/layout/TopBar";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { Panel } from "@/components/ui/Panel";
import { Tabs } from "@/components/ui/Tabs";
import { entityKey } from "@/lib/3d/ik700-model-map";
import { buildAssetModel } from "@/lib/asset-model";
import { piReferenceFor } from "@/lib/pi/pi-component-map";
import {
  resolveSelection,
  scopeConditions,
  scopeDocuments,
  scopeParts,
  scopeRecommendations,
  scopeServiceEvents,
  scopeSignals,
} from "@/lib/asset-selection";
import { useAssetTelemetry } from "@/lib/telemetry/use-telemetry";
import type { AssetRecords } from "@/types/installed-base";
import type { TelemetryFrame } from "@/types/telemetry";
import { AssetHeader } from "./AssetHeader";
import { DocumentPanel } from "./DocumentPanel";
import { EquipmentHierarchy } from "./EquipmentHierarchy";
import { EquipmentViewer } from "./EquipmentViewer";
import { IntelligencePanel } from "./IntelligencePanel";
import { LiveDemoControls } from "./LiveDemoControls";
import { PartsPanel } from "./PartsPanel";
import { ServiceHistory } from "./ServiceHistory";
import { TelemetryPanel } from "./TelemetryPanel";

/** Query parameter holding the selected hierarchy entity. */
export const ENTITY_PARAM = "entity";

/**
 * Asset intelligence screen. The ONLY selection state is the `?entity=` query
 * parameter; every panel derives its content from the same model + selection.
 */
export function AssetWorkspace({
  records,
  recentTelemetry,
}: {
  records: AssetRecords;
  recentTelemetry: TelemetryFrame[];
}) {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get(ENTITY_PARAM);

  const telemetry = useAssetTelemetry(
    { assetId: records.asset.id, cycleCount: records.asset.recordedCycles },
    recentTelemetry,
  );
  const model = useMemo(() => buildAssetModel(records, telemetry.assessment), [records, telemetry.assessment]);
  const selection = useMemo(() => resolveSelection(model, selectedId), [model, selectedId]);

  const select = useCallback((id: string | null) => {
    // Only the entity parameter changes; unrelated parameters (e.g. debug3d) are kept.
    const params = new URLSearchParams(window.location.search);
    if (id) params.set(ENTITY_PARAM, id);
    else params.delete(ENTITY_PARAM);
    const query = params.toString();
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
  }, []);

  const { customer, plant, unit } = records;
  const breadcrumbs: BreadcrumbItem[] = [
    { label: customer.name, href: `/customers/${customer.id}` },
    { label: plant.name, href: `/plants/${plant.id}` },
    { label: unit.name, href: `/plants/${plant.id}#${unit.id}` },
    ...selection.path.map((node) => ({
      label: node.name,
      onClick: () => select(node.type === "asset" ? null : node.id),
    })),
  ];

  const scopeName = selection.node.name;
  const drawings = scopeDocuments(model, selection, ["drawing", "procedure"]);
  const piSheets = scopeDocuments(model, selection, ["pi_sheet"]);
  // Only exact component mappings open the interactive PI (no inheritance from parents).
  const piReference = piReferenceFor(entityKey(model.rootId, selection.node.id));
  const bom = scopeParts(model, selection);
  // Only cite a BOM document filed against the node that owns the BOM lines shown.
  const bomOwnerId = bom.inheritedFrom?.id ?? selection.node.id;
  const bomDocument = model.records.documents.find((d) => d.kind === "bom" && d.entityId === bomOwnerId) ?? null;
  // Nodes without their own monitoring show their parent's telemetry, labelled as such.
  const telemetryScope = selection.monitoredVia
    ? { name: `${scopeName} (via ${selection.monitoredVia.name})`, status: selection.monitoredVia.status }
    : { name: scopeName, status: selection.node.status };

  return (
    <>
      <TopBar breadcrumbs={breadcrumbs} />
      <AssetHeader model={model} />
      {telemetry.provider && <LiveDemoControls provider={telemetry.provider} snapshot={telemetry.snapshot} />}

      <main className="grid items-start gap-4 p-4 md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-[auto_auto_1fr] md:[grid-template-areas:'tree_viewer'_'tree_intel'_'tree_tabs'] lg:p-6 xl:grid-cols-[260px_minmax(0,1fr)_360px] xl:grid-rows-[auto_1fr] xl:[grid-template-areas:'tree_viewer_intel'_'tree_tabs_intel']">
        <div className="md:sticky md:top-18 md:[grid-area:tree]">
          <EquipmentHierarchy model={model} selection={selection} onSelect={select} />
        </div>

        <div className="min-w-0 md:[grid-area:viewer]">
          <EquipmentViewer model={model} selection={selection} onSelect={select} />
        </div>

        <div className="min-w-0 md:[grid-area:intel]">
          <IntelligencePanel
            model={model}
            selection={selection}
            conditions={scopeConditions(model, selection)}
            recommendations={scopeRecommendations(model, selection)}
            onSelect={select}
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
                    signals={scopeSignals(selection)}
                    frames={telemetry.snapshot.frames}
                    assessment={telemetry.assessment}
                    connection={telemetry.snapshot.connection}
                    scopeName={telemetryScope.name}
                    scopeStatus={telemetryScope.status}
                  />
                ),
              },
              {
                id: "drawing",
                label: "Drawing",
                icon: FileText,
                content: (
                  <DocumentPanel
                    key={`drawing-${selection.node.id}`}
                    documents={drawings.items}
                    inheritedFrom={drawings.inheritedFrom}
                    scopeName={scopeName}
                    emptyLabel="drawings or procedures"
                    onSelect={select}
                  />
                ),
              },
              {
                id: "pi",
                label: "Interactive PI",
                icon: ScanSearch,
                content: piReference ? (
                  <InteractivePIViewer
                    reference={piReference}
                    model={model}
                    selectedEntityId={selection.node.id}
                    onSelectEntity={select}
                  />
                ) : (
                  <DocumentPanel
                    key={`pi-${selection.node.id}`}
                    documents={piSheets.items}
                    inheritedFrom={piSheets.inheritedFrom}
                    parts={bom.items}
                    scopeName={scopeName}
                    emptyLabel="PI sheets"
                    onSelect={select}
                  />
                ),
              },
              {
                id: "service",
                label: "Service History",
                icon: History,
                content: (
                  <ServiceHistory
                    events={scopeServiceEvents(model, selection)}
                    model={model}
                    scopeName={scopeName}
                  />
                ),
              },
              {
                id: "parts",
                label: "Parts",
                icon: Package,
                content: (
                  <PartsPanel
                    parts={bom.items}
                    inheritedFrom={bom.inheritedFrom}
                    bomDocument={bomDocument}
                    model={model}
                    scopeName={scopeName}
                    onSelect={select}
                  />
                ),
              },
            ]}
          />
        </Panel>
      </main>
    </>
  );
}
