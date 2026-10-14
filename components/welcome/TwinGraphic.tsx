import type { CSSProperties } from "react";

/*
 * Abstract digital-twin emblem for the welcome screen: a precision gear inside
 * measurement rings, a slow scanning sweep and three anchored capability
 * tags. Pure SVG + CSS animation (no data, no numbers), decorative only.
 * All motion stops under prefers-reduced-motion (global rule).
 */

const CX = 300;
const CY = 300;

/** Spur-gear outline with trapezoidal teeth. */
function gearPath(teeth: number, rOuter: number, rRoot: number) {
  const step = (Math.PI * 2) / teeth;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const corners: [number, number][] = [
      [a - step * 0.5, rRoot],
      [a - step * 0.22, rRoot],
      [a - step * 0.12, rOuter],
      [a + step * 0.12, rOuter],
      [a + step * 0.22, rRoot],
    ];
    for (const [ang, r] of corners) pts.push(`${(CX + r * Math.cos(ang)).toFixed(1)},${(CY + r * Math.sin(ang)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

const spin = (seconds: number, reverse = false): CSSProperties => ({
  transformOrigin: `${CX}px ${CY}px`,
  transformBox: "view-box",
  animation: `ibis-orbit ${seconds}s linear infinite${reverse ? " reverse" : ""}`,
});

const TAGS = [
  { label: "Condition visibility", x: 462, y: 150, ax: 392, ay: 214 },
  { label: "Engineering context", x: 462, y: 452, ax: 388, ay: 392 },
  { label: "Maintenance planning", x: 70, y: 470, ax: 214, ay: 398 },
];

export function TwinGraphic({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 600" className={className} aria-hidden focusable="false">
      <defs>
        <radialGradient id="tw-core" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.35" />
          <stop offset="0.55" stopColor="var(--color-accent)" stopOpacity="0.08" />
          <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tw-gear" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--color-cyan)" />
          <stop offset="1" stopColor="var(--color-accent)" />
        </linearGradient>
        <linearGradient id="tw-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--color-cyan)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--color-cyan)" stopOpacity="0.32" />
        </linearGradient>
      </defs>

      {/* Ambient core glow */}
      <circle cx={CX} cy={CY} r="250" fill="url(#tw-core)" />

      {/* Measurement rings */}
      <g style={spin(120)}>
        <circle cx={CX} cy={CY} r="238" fill="none" stroke="var(--color-ink-3)" strokeOpacity="0.28" strokeDasharray="1 7" />
        {Array.from({ length: 72 }, (_, i) => {
          const a = (i / 72) * Math.PI * 2;
          const major = i % 6 === 0;
          const r1 = 226;
          const r2 = major ? 214 : 220;
          return (
            <line
              key={i}
              x1={CX + r1 * Math.cos(a)}
              y1={CY + r1 * Math.sin(a)}
              x2={CX + r2 * Math.cos(a)}
              y2={CY + r2 * Math.sin(a)}
              stroke={major ? "var(--color-accent)" : "var(--color-ink-3)"}
              strokeOpacity={major ? 0.7 : 0.3}
              strokeWidth={major ? 1.5 : 1}
            />
          );
        })}
      </g>
      <circle cx={CX} cy={CY} r="190" fill="none" stroke="var(--color-accent)" strokeOpacity="0.22" />
      <g style={spin(60, true)}>
        <circle cx={CX} cy={CY} r="172" fill="none" stroke="var(--color-cyan)" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="60 24 8 24" />
      </g>

      {/* Scanning sweep */}
      <g style={spin(9)}>
        <path d={`M${CX} ${CY} L${CX + 236} ${CY} A236 236 0 0 0 ${CX + 236 * Math.cos(-0.5)} ${CY + 236 * Math.sin(-0.5)} Z`} fill="url(#tw-sweep)" />
        <line x1={CX} y1={CY} x2={CX + 236} y2={CY} stroke="var(--color-cyan)" strokeOpacity="0.55" />
      </g>

      {/* Precision gear */}
      <g style={spin(48)}>
        <path d={gearPath(28, 132, 116)} fill="var(--color-panel)" fillOpacity="0.55" stroke="url(#tw-gear)" strokeWidth="2" />
        <circle cx={CX} cy={CY} r="88" fill="none" stroke="var(--color-accent)" strokeOpacity="0.45" />
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return <circle key={i} cx={CX + 62 * Math.cos(a)} cy={CY + 62 * Math.sin(a)} r="9" fill="none" stroke="var(--color-ink-3)" strokeOpacity="0.5" />;
        })}
      </g>
      {/* Hub */}
      <circle cx={CX} cy={CY} r="30" fill="var(--color-navy-950)" stroke="var(--color-cyan)" strokeWidth="2" />
      <circle cx={CX} cy={CY} r="7" fill="var(--color-cyan)" style={{ animation: "ibis-node 3.2s ease-in-out infinite" }} />

      {/* Anchored capability tags */}
      {TAGS.map((t, i) => (
        <g key={t.label} className="animate-enter" style={{ animationDelay: `${500 + i * 160}ms` }}>
          <line x1={t.ax} y1={t.ay} x2={t.x + (t.x > CX ? 0 : 166)} y2={t.y} stroke="var(--color-accent)" strokeOpacity="0.5" strokeDasharray="3 4" />
          <circle cx={t.ax} cy={t.ay} r="4" fill="var(--color-cyan)" style={{ animation: `ibis-node ${2.6 + i * 0.5}s ease-in-out ${i * 0.4}s infinite` }} />
          <g transform={`translate(${t.x}, ${t.y - 17})`}>
            <rect width="166" height="34" rx="8" fill="var(--color-navy-900)" fillOpacity="0.88" stroke="var(--color-line-strong)" />
            <circle cx="16" cy="17" r="3.5" fill="var(--color-accent)" />
            <text x="28" y="21.5" fill="var(--color-ink)" fontSize="12.5" fontWeight="600" fontFamily="var(--font-sans)">
              {t.label}
            </text>
          </g>
        </g>
      ))}
    </svg>
  );
}
