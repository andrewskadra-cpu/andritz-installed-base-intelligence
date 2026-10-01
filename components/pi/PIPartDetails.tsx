"use client";

import { Link2, Link2Off } from "lucide-react";
import { StatusDot } from "@/components/ui/StatusBadge";
import type { HierarchyNode } from "@/lib/asset-model";
import type { PIItem } from "@/lib/pi/pi-types";

function Row({ label, value }: { label: string; value: string | number | undefined | null }) {
  const missing = value === undefined || value === null || value === "";
  return (
    <div className="flex justify-between gap-3 border-b border-line py-1.5 last:border-b-0">
      <dt className="text-ink-3">{label}</dt>
      <dd className={`text-right ${missing ? "text-ink-3 italic" : "text-ink"}`}>{missing ? "Not available" : value}</dd>
    </div>
  );
}

/**
 * Details of the PI item selected in the viewer and how it relates to IBIS
 * equipment. Mappings come only from the approved component map; nothing is
 * inferred here.
 */
export function PIPartDetails({
  formLabel,
  sheetLabel,
  itemNumber,
  item,
  mappedNodes,
  selectedEntityId,
  onSelectEntity,
}: {
  formLabel: string;
  sheetLabel: string | null;
  itemNumber: string | null;
  item: PIItem | null;
  /** IBIS entities mapped to this item (several = physical instances). */
  mappedNodes: HierarchyNode[];
  selectedEntityId: string;
  onSelectEntity: (id: string) => void;
}) {
  if (!itemNumber) {
    return (
      <div className="text-xs text-ink-3">
        <p className="font-semibold text-ink-2">{formLabel}</p>
        <p className="mt-1">Select a numbered callout on the drawing, or search for an item.</p>
      </div>
    );
  }

  return (
    <div className="text-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">
        {formLabel} · Item {itemNumber}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{item?.name ?? "Item name not available"}</p>
      {!item && (
        <p className="mt-1 text-ink-3">This item is not indexed in the local drawing manifest.</p>
      )}
      <dl className="mt-2">
        <Row label="Shown on" value={sheetLabel} />
        <Row label="Part number" value={item?.partNumber} />
        <Row label="Quantity" value={item?.quantity} />
        <Row label="Notes" value={item?.notes} />
      </dl>

      <div className="mt-3 rounded bg-canvas px-2.5 py-2">
        {mappedNodes.length === 0 && (
          <p className="flex items-center gap-1.5 text-ink-2">
            <Link2Off size={13} className="shrink-0 text-ink-3" aria-hidden />
            No confident IBIS mapping for this item.
          </p>
        )}
        {mappedNodes.length === 1 && (
          <p className="flex items-center gap-1.5 text-ink-2">
            <Link2 size={13} className="shrink-0 text-info" aria-hidden />
            Linked to
            <StatusDot status={mappedNodes[0].status} />
            <span className="font-semibold text-ink">{mappedNodes[0].name}</span>
          </p>
        )}
        {mappedNodes.length > 1 && (
          <>
            <p className="flex items-center gap-1.5 text-ink-2">
              <Link2 size={13} className="shrink-0 text-info" aria-hidden />
              Shared by {mappedNodes.length} IBIS components:
            </p>
            <ul className="mt-1.5 space-y-1">
              {mappedNodes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onSelectEntity(n.id)}
                    aria-pressed={n.id === selectedEntityId}
                    className={`flex w-full items-center gap-1.5 rounded border px-2 py-1 text-left ${
                      n.id === selectedEntityId
                        ? "border-info bg-info-soft text-ink"
                        : "border-line bg-panel text-ink-2 hover:text-ink"
                    }`}
                  >
                    <StatusDot status={n.status} />
                    {n.name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
