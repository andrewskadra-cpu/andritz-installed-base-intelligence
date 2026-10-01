"use client";

import { useState } from "react";
import { ArrowRight, CornerLeftUp, FileText, ScanLine } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import type { HierarchyNode } from "@/lib/asset-model";
import type { DocumentKind, DocumentRecord, PartRecord } from "@/types/installed-base";

const KIND_LABEL: Record<DocumentKind, string> = {
  drawing: "Drawing",
  pi_sheet: "PI sheet",
  procedure: "Procedure",
  bom: "BOM",
};

export function InheritedNotice({ from, scopeName, what }: { from: HierarchyNode; scopeName: string; what: string }) {
  return (
    <p className="mb-3 flex items-center gap-1.5 rounded bg-canvas px-3 py-2 text-xs text-ink-2">
      <CornerLeftUp size={13} className="shrink-0 text-ink-3" aria-hidden />
      No {what} filed against {scopeName}. Showing {what} from parent {from.name}.
    </p>
  );
}

/**
 * Document register for the selected node. Files are not connected yet; a
 * placeholder sheet is shown. With `parts` (Interactive PI) item callouts are
 * linked to the node's BOM lines.
 */
export function DocumentPanel({
  documents,
  inheritedFrom,
  parts,
  scopeName,
  emptyLabel,
  onSelect,
}: {
  documents: DocumentRecord[];
  inheritedFrom: HierarchyNode | null;
  parts?: PartRecord[];
  scopeName: string;
  emptyLabel: string;
  onSelect: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const active = documents.find((d) => d.id === activeId) ?? documents[0];

  if (!active) return <EmptyState title={`No ${emptyLabel} filed for ${scopeName}`} />;

  return (
    <div>
      {inheritedFrom && <InheritedNotice from={inheritedFrom} scopeName={scopeName} what={emptyLabel} />}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <ul className="space-y-1.5">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => setActiveId(doc.id)}
                aria-pressed={doc.id === active.id}
                className={`flex w-full gap-2.5 rounded border px-3 py-2 text-left ${
                  doc.id === active.id ? "border-navy-700 bg-canvas" : "border-line hover:bg-canvas"
                }`}
              >
                <FileText size={16} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium leading-snug text-ink">{doc.title}</span>
                  <span className="mt-0.5 block font-mono text-[11px] text-ink-3">
                    {KIND_LABEL[doc.kind]} · {doc.documentNumber} · Rev {doc.revision}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="min-w-0 rounded border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 text-xs">
            <span className="font-mono text-ink-2">
              {active.documentNumber} · Rev {active.revision} · {formatDate(active.updated)}
            </span>
            <span className="text-ink-3">Demo placeholder · document file not connected</span>
          </div>
          <div
            className="relative grid min-h-64 place-items-center bg-[#fbfcfd] p-6"
            style={{
              backgroundImage:
                "linear-gradient(#eef1f5 1px, transparent 1px), linear-gradient(90deg, #eef1f5 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          >
            <div className="text-center text-ink-3">
              <ScanLine size={28} className="mx-auto" aria-hidden />
              <p className="mt-2 text-sm font-medium text-ink-2">{active.title}</p>
              <p className="mt-1 text-xs">Sheet preview will render here once document storage is connected.</p>
            </div>

            {parts && parts.length > 0 && (
              <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-1.5">
                {parts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveItem(p.itemNumber === activeItem ? null : p.itemNumber)}
                    className={`grid size-7 place-items-center rounded-full border font-mono text-xs font-semibold ${
                      p.itemNumber === activeItem
                        ? "border-navy-900 bg-navy-900 text-white"
                        : "border-navy-700 bg-panel text-navy-700 hover:bg-canvas"
                    }`}
                    aria-label={`Item ${p.itemNumber}: ${p.description}`}
                  >
                    {p.itemNumber}
                  </button>
                ))}
              </div>
            )}
          </div>

          {parts && parts.length > 0 && (
            <table className="w-full border-t border-line text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-3">
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">Demo part no.</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Reference</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setActiveItem(p.itemNumber)}
                    className={`cursor-pointer border-b border-line last:border-0 ${
                      p.itemNumber === activeItem ? "bg-info-soft" : "hover:bg-canvas"
                    }`}
                  >
                    <td className="px-3 py-1.5 font-mono text-ink-2">{p.itemNumber}</td>
                    <td className="px-3 py-1.5 font-mono text-ink">
                      {p.partNumber ?? <span className="font-sans text-ink-3">Not assigned</span>}
                    </td>
                    <td className="px-3 py-1.5 text-ink-2">{p.description}</td>
                    <td className="px-3 py-1.5 font-mono text-xs text-ink-2">
                      {p.sourceReference ? `${p.sourceReference.document} · Item ${p.sourceReference.item}` : (p.note ?? "—")}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {p.linkedEntityId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(p.linkedEntityId!);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:underline"
                        >
                          Open <ArrowRight size={12} aria-hidden />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
