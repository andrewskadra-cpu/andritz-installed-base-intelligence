import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ArrowRight, Boxes, FileCog, FlaskConical, MonitorPlay, Radar, Wrench } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { EnterLink } from "@/components/welcome/EnterLink";
import { TwinGraphic } from "@/components/welcome/TwinGraphic";

export const metadata: Metadata = {
  title: "Welcome",
  description: "ANDRITZ IBIS: Installed-Base Intelligence System. Demo entry.",
};

/*
 * Welcome / entry screen. Purely presentational: there is no authentication
 * in this prototype, so no credentials are requested and nothing is gated.
 * "Enter IBIS" is a plain link into the workspace that also marks the welcome
 * screen as seen for this browser session. All motion is CSS/SVG and stops
 * under prefers-reduced-motion.
 */

const NODES: [number, number][] = [
  [140, 180], [330, 110], [520, 210], [700, 120], [900, 200], [1080, 130],
  [210, 400], [420, 360], [610, 440], [800, 360], [1000, 430],
  [120, 620], [340, 600], [560, 660], [760, 590], [960, 650], [1120, 560],
];

const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 6], [1, 7], [2, 7], [3, 9], [4, 9], [5, 10],
  [6, 7], [7, 8], [8, 9], [9, 10], [6, 11], [7, 12], [8, 13], [9, 14], [10, 15], [10, 16],
  [11, 12], [12, 13], [13, 14], [14, 15], [15, 16], [2, 8], [8, 14],
];

/** Gentle curve between two nodes so the network reads as organic, not a grid. */
function edgePath([a, b]: [number, number]) {
  const [x1, y1] = NODES[a];
  const [x2, y2] = NODES[b];
  const mx = (x1 + x2) / 2 + (y2 - y1) * 0.12;
  const my = (y1 + y2) / 2 - (x2 - x1) * 0.12;
  return `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
}

// Edges that carry a moving light trail, with staggered timing.
const TRAILS = [0, 3, 7, 12, 15, 19, 22, 26, 9, 17];

const CAPABILITIES = [
  { icon: Radar, title: "Condition visibility", text: "Component-level health from monitored signals, with evidence kept explicit." },
  { icon: Boxes, title: "Digital-twin context", text: "Select parts on the 3D model and trace them through the equipment hierarchy." },
  { icon: FileCog, title: "Engineering context", text: "Interactive parts illustrations linked to the components they describe." },
  { icon: Wrench, title: "Maintenance planning", text: "Draft outage scopes and parts inquiries, ready for technician review." },
];

const enter = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

/** Asset the demo walkthrough opens on (critical gearbox, degrading live telemetry). */
const DEMO_ASSET = "/assets/ik700-10482";

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  // Arrived via "Enter demo mode": the layout records ?demo=1 for the session, and
  // Enter IBIS lands on the demo asset, where live telemetry starts automatically.
  const demo = (await searchParams).demo === "1";
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-navy-950 text-ink">
      {/* ── Background: drifting grid ── */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 opacity-60 [mask-image:radial-gradient(ellipse_75%_65%_at_55%_45%,#000_30%,transparent_100%)]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(56 139 255 / 0.09) 1px, transparent 1px), linear-gradient(90deg, rgb(56 139 255 / 0.09) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          animation: "ibis-grid-drift 16s linear infinite",
        }}
      />
      {/* ── Background: glows ── */}
      <div aria-hidden className="absolute -right-40 -top-40 -z-20 size-[760px] rounded-full bg-accent/15 blur-[150px]" />
      <div aria-hidden className="absolute -bottom-56 -left-40 -z-20 size-[640px] rounded-full bg-cyan/10 blur-[140px]" />

      {/* ── Background: connected installed-base network ── */}
      <svg
        aria-hidden
        viewBox="0 0 1240 780"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 -z-10 h-full w-full opacity-70 [mask-image:linear-gradient(90deg,transparent_0%,#000_30%,#000_70%,transparent_100%)]"
      >
        <defs>
          <radialGradient id="ibis-node-glow">
            <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {EDGES.map((e, i) => (
          <path key={`e-${i}`} d={edgePath(e)} fill="none" stroke="var(--color-ink-3)" strokeOpacity="0.16" strokeWidth="1" />
        ))}
        {TRAILS.map((edge, i) => (
          <path
            key={`t-${edge}`}
            d={edgePath(EDGES[edge])}
            fill="none"
            stroke="var(--color-cyan)"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="0.18 1"
            opacity="0"
            style={{ animation: `ibis-trail ${3.6 + (i % 4) * 0.7}s ease-in-out ${i * 0.65}s infinite` }}
          />
        ))}
        {NODES.map(([x, y], i) => (
          <g key={`n-${i}`}>
            <circle cx={x} cy={y} r="14" fill="url(#ibis-node-glow)" />
            <circle
              cx={x}
              cy={y}
              r="2.4"
              fill={i % 5 === 2 ? "var(--color-cyan)" : "var(--color-ink)"}
              style={{ animation: `ibis-node ${3 + (i % 3)}s ease-in-out ${(i * 0.37) % 3}s infinite` }}
            />
          </g>
        ))}
      </svg>

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 py-6 lg:px-14">
        <div className="flex items-center gap-3">
          <BrandMark size={42} />
          <div className="leading-tight">
            <div className="text-2xs font-bold tracking-[0.34em] text-ink-2">ANDRITZ</div>
            <div className="text-base font-semibold tracking-tight text-ink">IBIS</div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-raised/70 px-3 py-1 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-2 backdrop-blur">
          <FlaskConical size={12} className="text-cyan" aria-hidden /> {demo ? "Demo mode · live telemetry" : "Demo environment"}
        </span>
      </header>

      {/* ── Hero ── */}
      <main className="mx-auto grid w-full max-w-[1500px] flex-1 items-center gap-10 px-6 pb-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:px-14">
        <div className="max-w-2xl">
          <div className="eyebrow flex animate-enter items-center gap-2 text-cyan" style={enter(0)}>
            <span className="h-px w-8 bg-cyan/60" aria-hidden /> ANDRITZ · Installed-Base Intelligence System
          </div>
          <h1 className="mt-5 animate-enter text-5xl font-semibold leading-[1.04] tracking-tight text-ink xl:text-[4.25rem]" style={enter(80)}>
            Welcome to{" "}
            <span className="bg-gradient-to-r from-accent to-cyan bg-clip-text text-transparent">IBIS</span>
          </h1>
          <p className="mt-3 animate-enter text-lg font-medium text-ink-2" style={enter(140)}>
            Installed-Base Intelligence System (IBIS)
          </p>
          <p className="mt-6 max-w-xl animate-enter text-lg leading-relaxed text-ink-2" style={enter(200)}>
            Connected asset intelligence for condition visibility, engineering context, and maintenance planning, from
            customer and plant down to the individual bearing.
          </p>

          <div className="mt-9 flex animate-enter flex-wrap items-center gap-3" style={enter(280)}>
            <EnterLink href={demo ? DEMO_ASSET : "/overview"} className="btn-primary group h-13 px-7 text-base shadow-glow">
              {demo && <MonitorPlay size={18} aria-hidden />}
              Enter IBIS
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </EnterLink>
            <EnterLink href={demo ? "/overview" : DEMO_ASSET} className="btn-secondary h-13 px-6 text-base">
              {demo ? "Open Command Center" : "View demo workspace"}
            </EnterLink>
          </div>
          <p className="mt-4 flex animate-enter items-center gap-2 text-xs text-ink-3" style={enter(340)}>
            <span className="size-1.5 rounded-full bg-cyan" aria-hidden />
            {demo
              ? "Demo mode: live simulated telemetry starts automatically · synthetic data · no sign-in required"
              : "Prototype environment · synthetic demo data · no sign-in required"}
          </p>

          <ul className="mt-12 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {CAPABILITIES.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex animate-enter gap-3.5" style={enter(420 + i * 90)}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-raised/70 text-accent backdrop-blur">
                  <Icon size={19} aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-3">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative hidden animate-fade lg:block" style={enter(200)}>
          <TwinGraphic className="mx-auto h-auto w-full max-w-[640px] drop-shadow-[0_0_40px_rgb(56_139_255/0.18)]" />
        </div>
      </main>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-5 text-2xs text-ink-3 lg:px-14">
        <span>Demonstration prototype. Representative visualization model, not manufacturing CAD. No live customer data.</span>
        <span className="font-mono">IBIS · demo build</span>
      </footer>
    </div>
  );
}
