import { EmptyState } from "@/components/ui/EmptyState";
import type { PartRecord } from "@/types/installed-base";

export function PartsPanel({
  parts,
  scopeName,
  nodeName,
}: {
  parts: PartRecord[];
  scopeName: string;
  nodeName: (id: string) => string;
}) {
  if (parts.length === 0) return <EmptyState title={`No parts listed for ${scopeName}`} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-3">
            <th className="py-2 pr-4 font-medium">Item</th>
            <th className="py-2 pr-4 font-medium">Part number</th>
            <th className="py-2 pr-4 font-medium">Description</th>
            <th className="py-2 pr-4 font-medium">Location</th>
            <th className="py-2 text-right font-medium">Qty</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((p) => (
            <tr key={p.id} className="border-b border-line last:border-0">
              <td className="py-2 pr-4 font-mono text-ink-3">{p.itemNumber}</td>
              <td className="py-2 pr-4 font-mono font-medium text-ink">{p.partNumber}</td>
              <td className="py-2 pr-4 text-ink-2">{p.description}</td>
              <td className="py-2 pr-4 text-ink-2">{nodeName(p.targetId)}</td>
              <td className="py-2 text-right font-mono tabular text-ink">{p.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
