import { ArrowRight } from "lucide-react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusDot } from "@/components/ui/StatusBadge";
import type { AssetModel, HierarchyNode } from "@/lib/asset-model";
import type { DocumentRecord, PartRecord } from "@/types/installed-base";
import { InheritedNotice } from "./DocumentPanel";

/** Bill of materials for the selected node. Lines that are hierarchy nodes can be opened. */
export function PartsPanel({
  parts,
  inheritedFrom,
  bomDocument,
  model,
  scopeName,
  onSelect,
}: {
  parts: PartRecord[];
  inheritedFrom: HierarchyNode | null;
  bomDocument: DocumentRecord | null;
  model: AssetModel;
  scopeName: string;
  onSelect: (id: string) => void;
}) {
  if (parts.length === 0) return <EmptyState title={`No BOM lines for ${scopeName}`} />;
  const owner = inheritedFrom?.name ?? scopeName;

  return (
    <div>
      {inheritedFrom && <InheritedNotice from={inheritedFrom} scopeName={scopeName} what="BOM lines" />}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-ink-3">
        <DemoBadge label="Fictional part identifiers" />
        <span>
          BOM for {owner}
          {bomDocument && (
            <>
              {" "}· source <span className="font-mono">{bomDocument.documentNumber}</span>
            </>
          )}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-3">
              <th className="py-2 pr-4 font-medium">Item</th>
              <th className="py-2 pr-4 font-medium">Demo part no.</th>
              <th className="py-2 pr-4 font-medium">Description</th>
              <th className="py-2 pr-4 font-medium">Reference</th>
              <th className="py-2 pr-4 text-right font-medium">Qty</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => {
              const linked = p.linkedEntityId ? model.nodes[p.linkedEntityId] : null;
              return (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4 font-mono text-ink-3">{p.itemNumber}</td>
                  <td className="py-2 pr-4 font-mono font-medium text-ink">
                    {p.partNumber ?? <span className="font-sans font-normal text-ink-3">Not assigned</span>}
                  </td>
                  <td className="py-2 pr-4 text-ink-2">{p.description}</td>
                  <td className="py-2 pr-4 text-xs">
                    {p.sourceReference ? (
                      <span className="font-mono text-ink">
                        {p.sourceReference.document} · Item {p.sourceReference.item}
                      </span>
                    ) : (
                      <span className="text-ink-3">{p.note ?? "—"}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono tabular text-ink">{p.quantity}</td>
                  <td className="py-2 pr-4">{linked && <StatusDot status={linked.status} />}</td>
                  <td className="py-2 text-right">
                    {linked && (
                      <button
                        type="button"
                        onClick={() => onSelect(linked.id)}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-navy-700 hover:underline"
                      >
                        Open {linked.type} <ArrowRight size={12} aria-hidden />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
