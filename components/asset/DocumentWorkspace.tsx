"use client";

import { useState } from "react";
import { FileText, Info, ScanSearch } from "lucide-react";
import { InteractivePIViewer } from "@/components/pi/InteractivePIViewer";
import type { AssetModel, HierarchyNode } from "@/lib/asset-model";
import type { Selection } from "@/lib/asset-selection";
import { PI_FORMS } from "@/lib/pi/pi-registry";
import type { PIReference } from "@/lib/pi/pi-types";
import type { DocumentRecord, PartRecord } from "@/types/installed-base";
import { DocumentPanel } from "./DocumentPanel";

type DocTab = "pi" | "drawings";

/**
 * Document pane of the asset workspace (Split View / Documents Focus).
 *
 * The Interactive PI opens on the selected component's exact PI item when one
 * is mapped. Otherwise it shows the PI form documented for this equipment
 * model with no item preselected, and says so: nothing is inferred from a
 * parent, and selecting a callout that maps to exactly one component still
 * drives the shared selection (two-way sync is unchanged).
 */
export function DocumentWorkspace({
  model,
  selection,
  onSelect,
  piReference,
  drawings,
  piSheets,
  bom,
}: {
  model: AssetModel;
  selection: Selection;
  onSelect: (id: string | null) => void;
  /** Exact PI reference for the selected node, or null. */
  piReference: PIReference | null;
  drawings: { items: DocumentRecord[]; inheritedFrom: HierarchyNode | null };
  piSheets: { items: DocumentRecord[]; inheritedFrom: HierarchyNode | null };
  bom: PartRecord[];
}) {
  const [tab, setTab] = useState<DocTab>("pi");
  const scopeName = selection.node.name;
  const formForModel = Object.values(PI_FORMS).find((f) => f.equipmentModels.includes(model.records.asset.model)) ?? null;
  const reference: PIReference | null = piReference ?? (formForModel ? { form: formForModel.form, item: null } : null);
  const fallbackForm = !piReference && formForModel;

  const tabCls = (active: boolean) =>
    `-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors ${
      active ? "border-accent font-semibold text-ink" : "border-transparent font-medium text-ink-3 hover:text-ink"
    }`;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-panel" aria-label="Engineering documents">
      <div className="flex items-end gap-1 border-b border-line bg-sunken/60 px-3" role="tablist" aria-label="Document type">
        <button type="button" role="tab" aria-selected={tab === "pi"} onClick={() => setTab("pi")} className={tabCls(tab === "pi")}>
          <ScanSearch size={16} className={tab === "pi" ? "text-accent" : ""} aria-hidden /> Interactive PI
        </button>
        <button type="button" role="tab" aria-selected={tab === "drawings"} onClick={() => setTab("drawings")} className={tabCls(tab === "drawings")}>
          <FileText size={16} className={tab === "drawings" ? "text-accent" : ""} aria-hidden /> Drawings &amp; procedures
        </button>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto p-4 ${tab === "pi" && reference ? "flex flex-col" : ""}`} role="tabpanel">
        {tab === "pi" ? (
          reference ? (
            <>
              {fallbackForm && (
                <p className="mb-3 flex shrink-0 gap-2 rounded-lg border border-line bg-sunken/70 px-3.5 py-2.5 text-sm text-ink-2">
                  <Info size={16} className="mt-0.5 shrink-0 text-info" aria-hidden />
                  <span>
                    No PI item is mapped to <strong className="text-ink">{scopeName}</strong>. Showing {formForModel.label} ·{" "}
                    {formForModel.title} for the {model.records.asset.model}. Select a callout to inspect a part; mapped items select their
                    component in 3D.
                  </span>
                </p>
              )}
              <InteractivePIViewer
                reference={reference}
                model={model}
                selectedEntityId={selection.node.id}
                onSelectEntity={onSelect}
                fill
              />
            </>
          ) : (
            <DocumentPanel
              key={`pi-${selection.node.id}`}
              documents={piSheets.items}
              inheritedFrom={piSheets.inheritedFrom}
              parts={bom}
              scopeName={scopeName}
              emptyLabel="PI sheets"
              onSelect={onSelect}
            />
          )
        ) : (
          <DocumentPanel
            key={`drawing-${selection.node.id}`}
            documents={drawings.items}
            inheritedFrom={drawings.inheritedFrom}
            scopeName={scopeName}
            emptyLabel="drawings or procedures"
            onSelect={onSelect}
          />
        )}
      </div>
    </section>
  );
}
