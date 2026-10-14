/** Minimal inline trend line with the demo baseline; decorative only (values are shown as text alongside). */
export function Sparkline({
  values,
  baseline,
  className = "",
  color = "var(--color-cyan)",
}: {
  values: number[];
  baseline?: number;
  className?: string;
  color?: string;
}) {
  if (values.length < 2) return null;
  const W = 160;
  const H = 40;
  const min = Math.min(...values, baseline ?? Infinity);
  const max = Math.max(...values, baseline ?? -Infinity);
  const span = max - min || 1;
  const y = (v: number) => H - 3 - ((v - min) / span) * (H - 6);
  const points = values.map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden focusable="false">
      {baseline !== undefined && (
        <line x1="0" x2={W} y1={y(baseline)} y2={y(baseline)} stroke="var(--color-ink-3)" strokeOpacity="0.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      )}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
