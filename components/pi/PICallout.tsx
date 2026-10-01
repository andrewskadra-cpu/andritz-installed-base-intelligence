import type { PICallout as PICalloutData } from "@/lib/pi/pi-types";

const DEFAULT_RADIUS = 18;

export function calloutRadius(callout: PICalloutData): number {
  return callout.r ?? DEFAULT_RADIUS;
}

/**
 * One numbered callout region on a sheet (SVG, sheet pixel space). Hit
 * testing is done by the canvas so pans and clicks are told apart.
 */
export function PICallout({
  item,
  callout,
  label,
  mapped,
  selected,
}: {
  item: string;
  callout: PICalloutData;
  label: string;
  mapped: boolean;
  selected: boolean;
}) {
  const r = calloutRadius(callout);
  return (
    <g className="group" data-item={item} data-selected={selected || undefined}>
      <title>{label + (mapped ? " · linked to IBIS equipment" : "")}</title>
      {selected && (
        <circle
          cx={callout.x}
          cy={callout.y}
          r={r * 1.55}
          fill="none"
          stroke="#1f5fbf"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          className="origin-center animate-[pi-pulse_1.4s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ transformBox: "fill-box" }}
        />
      )}
      <circle
        cx={callout.x}
        cy={callout.y}
        r={r}
        vectorEffect="non-scaling-stroke"
        className={
          selected
            ? "fill-[#1f5fbf]/20 stroke-[#1f5fbf] [stroke-width:3]"
            : "fill-transparent stroke-transparent [stroke-width:1.5] group-hover:fill-[#1f5fbf]/10 group-hover:stroke-[#1f5fbf]"
        }
      />
    </g>
  );
}
