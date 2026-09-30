"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Info, Printer, RefreshCw } from "lucide-react";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { KeyValue } from "@/components/ui/KeyValue";
import { StatusBadge, StatusDot } from "@/components/ui/StatusBadge";
import { STATUS_META } from "@/components/ui/status";
import { buildAssetModel } from "@/lib/asset-model";
import { formatDate, formatTime } from "@/lib/format";
import { generateOutageScope } from "@/lib/outage/generate-outage-scope";
import { assessHealth } from "@/lib/telemetry/health-engine";
import { captureTelemetry, getCapture, subscribeCapture } from "@/lib/telemetry/telemetry-registry";
import type { AssetRecords, Customer, Plant, PlantUnit } from "@/types/installed-base";
import type {
  EngineeringRecord,
  InspectionChecklistItem,
  OutageScope,
  OutageScopeAsset,
  PlannedOutage,
  SuggestedTiming,
} from "@/types/outage";
import type { TelemetryFrame } from "@/types/telemetry";
import { TraceChips } from "./TraceChips";

export interface OutageScopeViewProps {
  customer: Customer;
  plant: Plant;
  units: PlantUnit[];
  outage: PlannedOutage | null;
  assets: { records: AssetRecords; recentTelemetry: TelemetryFrame[] }[];
  checklist: InspectionChecklistItem[];
}

export const PLANNING_NOTICE =
  "These suggestions are generated from available condition, service, and engineering data for planning support only. Final inspection, maintenance, repair, and outage decisions remain subject to qualified engineering, maintenance, and site review.";

const PROTOTYPE_NOTICE =
  "Prototype suggestions are based on synthetic demo data and are intended to demonstrate workflow only.";

const TIMING: Record<SuggestedTiming, { label: string; className: string }> = {
  earliest_opportunity: { label: "Earliest opportunity", className: "border-critical/30 bg-critical-soft text-critical" },
  planned_outage: { label: "Planned outage", className: "border-attention/30 bg-attention-soft text-attention" },
};

const RECORD_KIND: Record<EngineeringRecord["kind"], string> = {
  drawing: "Drawing",
  pi_sheet: "PI sheet",
  procedure: "Service procedure",
  bom: "BOM",
  service_event: "Service history",
};

const utc = (iso: string) => `${formatDate(iso)} ${formatTime(iso)} UTC`;

function Section({ id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 break-inside-avoid-page">
      <div className="mb-3 border-b border-line pb-2">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded border border-line">
      <table className="w-full text-sm">
        <thead className="bg-canvas">
          <tr className="text-left text-[11px] uppercase tracking-wide text-ink-3">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line align-top">{children}</tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ScopeHeader({ scope, live }: { scope: OutageScope; live: boolean }) {
  const { outage } = scope;
  return (
    <header className="rounded-md border border-line bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">Outage planning suggestions</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{scope.name}</h1>
        </div>
        <DemoBadge label="Synthetic demo data" />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <KeyValue label="Customer" value={scope.customer.name} />
        <KeyValue label="Plant" value={scope.plant.name} />
        <KeyValue label="Unit" value={scope.units.map((u) => u.name).join(", ")} />
        <KeyValue
          label="Planned window (demo)"
          value={outage ? `${formatDate(outage.plannedStart)} – ${formatDate(outage.plannedEnd)}` : "Not scheduled"}
          mono
        />
        <KeyValue label="Generated" value={utc(scope.generatedAt)} mono />
        <KeyValue
          label={live ? "Telemetry as of (live session)" : "Telemetry as of"}
          value={scope.telemetryAsOf ? utc(scope.telemetryAsOf) : "—"}
          mono
        />
      </dl>
      <p className="mt-4 flex gap-1.5 rounded bg-canvas px-3 py-2 text-xs leading-snug text-ink-2">
        <Info size={13} className="mt-px shrink-0 text-ink-3" aria-hidden />
        <span>
          {PROTOTYPE_NOTICE} Final maintenance decisions require appropriate engineering and technician review.
        </span>
      </p>
    </header>
  );
}

function ExecutiveSummary({ scope }: { scope: OutageScope }) {
  const s = scope.summary;
  const tiles: { label: string; value: number; tone?: keyof typeof STATUS_META }[] = [
    { label: "Assets reviewed", value: s.assetsReviewed },
    { label: "Critical assets", value: s.criticalAssets, tone: "critical" },
    { label: "Attention assets", value: s.attentionAssets, tone: "attention" },
    { label: "Suggested inspection considerations", value: s.inspectionConsiderations },
    { label: "Components suggested for review", value: s.componentsForReview },
    { label: "Parts to consider having available", value: s.partsToConsider },
  ];
  const top = scope.priorityAssets[0];
  return (
    <Section title="Executive summary">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`rounded-md border border-line bg-panel px-3 py-2.5 ${t.tone ? `border-l-4 ${STATUS_META[t.tone].accent}` : ""}`}
          >
            <div className="text-[10px] font-medium uppercase leading-tight tracking-[0.06em] text-ink-3">{t.label}</div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular text-ink">{t.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-2">
        {top ? (
          <>
            Based on available condition indicators, <strong className="text-ink">{top.name}</strong> is the
            highest-priority asset
            {top.priorityArea && (
              <>
                , with <strong className="text-ink">{top.priorityArea.name}</strong> as the potential area of concern
              </>
            )}
            . {scope.priorityAssets.length} of {s.assetsReviewed} assets show active condition indicators. No
            technician-confirmed mechanical failure is on record unless stated in the evidence below.
          </>
        ) : (
          <>No reviewed asset shows active condition indicators. Routine outage checks only.</>
        )}
      </p>
    </Section>
  );
}

function PriorityOverview({ scope }: { scope: OutageScope }) {
  return (
    <Section title="Priority assets" subtitle="Ranked by health status, then number of active condition indicators.">
      <Table head={["#", "Asset", "Health", "Potential area of concern", "Detected condition indicators", "Considerations"]}>
        {scope.priorityAssets.map((a) => (
          <tr key={a.assetId}>
            <td className="px-3 py-2 font-mono text-ink-3">{a.rank}</td>
            <td className="px-3 py-2">
              <a href={`#scope-asset-${a.assetId}`} className="font-semibold text-ink hover:underline">
                {a.name}
              </a>
              <div className="text-xs text-ink-3">{a.position}</div>
            </td>
            <td className="px-3 py-2">
              <StatusBadge status={a.status} size="sm" />
            </td>
            <td className="px-3 py-2">
              {a.priorityArea ? (
                <span className="flex items-center gap-1.5">
                  <StatusDot status={a.priorityArea.status} /> {a.priorityArea.name}
                </span>
              ) : (
                "—"
              )}
            </td>
            <td className="px-3 py-2 text-xs text-ink-2">
              {a.signals.filter((s) => s.detection).map((s) => (
                <div key={s.key}>{s.detection}</div>
              ))}
            </td>
            <td className="px-3 py-2 text-right font-mono tabular text-ink">{a.inspections.length}</td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

function AssetDetail({ asset }: { asset: OutageScopeAsset }) {
  return (
    <section
      id={`scope-asset-${asset.assetId}`}
      className={`scroll-mt-20 rounded-md border border-l-4 border-line bg-panel ${STATUS_META[asset.status].accent}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm text-ink-3">#{asset.rank}</span>
          <Link href={asset.href} className="text-lg font-semibold text-ink hover:underline">
            {asset.name}
          </Link>
          <StatusBadge status={asset.status} />
          <span className="text-xs text-ink-3">
            S/N <span className="font-mono">{asset.serialNumber}</span> · {asset.equipmentType} · {asset.position}
          </span>
        </div>
        {asset.priorityArea && (
          <Link
            href={asset.priorityArea.href}
            className="flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink print:hidden"
          >
            Potential area of concern: <strong className="text-ink">{asset.priorityArea.name}</strong>
            <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </header>

      <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Evidence / reasoning</h3>
          {asset.issues.map((issue) => (
            <article key={issue.id} className="break-inside-avoid rounded border border-line">
              <header className="flex items-start justify-between gap-2 border-b border-line bg-canvas/60 px-3 py-2">
                <div>
                  <h4 className="text-sm font-semibold text-ink">{issue.title}</h4>
                  <div className="text-xs text-ink-3">{issue.entityName}</div>
                </div>
                <StatusBadge status={issue.status} size="sm" />
              </header>
              <ol className="divide-y divide-line">
                {issue.evidence.map((ev) => (
                  <li key={ev.level} className="flex gap-2.5 px-3 py-2">
                    <EvidenceBadge level={ev.level} unconfirmed={ev.level === "confirmed" && !issue.technicianConfirmed} />
                    <div className="min-w-0 space-y-1 text-[13px] leading-snug">
                      <p className={ev.level === "inferred" ? "italic text-ink-2" : "text-ink"}>{ev.statement}</p>
                      <p className="text-[11px] text-ink-3">{ev.source}</p>
                      <TraceChips trace={ev.trace} />
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>

        <div className="space-y-5">
          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Condition indicators (live demo telemetry)
            </h3>
            <ul className="divide-y divide-line rounded border border-line">
              {asset.signals.map((s) => (
                <li key={s.key} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-start gap-2">
                    <StatusDot status={s.status} className="mt-1.5" />
                    <span className="min-w-0">
                      <span className="block text-ink">{s.label}</span>
                      <span className="block text-xs text-ink-3">{s.detection ?? "Within demo limits"}</span>
                    </span>
                  </span>
                  <span className="whitespace-nowrap font-mono tabular text-ink">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Components suggested for review
            </h3>
            {asset.components.length === 0 ? (
              <p className="text-sm text-ink-3">None beyond the assemblies listed.</p>
            ) : (
              <ul className="space-y-1.5">
                {asset.components.map((c) => (
                  <li key={c.id}>
                    <Link href={c.href} className="block rounded border border-line px-3 py-2 hover:bg-canvas">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-ink">
                          {c.name} <span className="font-normal text-ink-3">· in {c.parentName}</span>
                        </span>
                        <StatusBadge status={c.status} size="sm" />
                      </span>
                      <span className="mt-0.5 block font-mono text-[11px] text-ink-3">
                        {[c.partNumber, c.reference].filter(Boolean).join(" · ") || "No part number assigned"}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-2">{c.reason}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Inspections({ scope }: { scope: OutageScope }) {
  const rows = scope.priorityAssets.flatMap((a) => a.inspections);
  return (
    <Section
      id="inspections"
      title="Suggested inspection considerations"
      subtitle="Demo suggestions for technician verification. Not a diagnosis and not an instruction to repair or replace."
    >
      {rows.length === 0 ? (
        <p className="text-sm text-ink-3">No inspection considerations beyond routine outage checks.</p>
      ) : (
        <Table head={["#", "Equipment", "Consideration", "Suggested timing", "Traceability"]}>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td className="px-3 py-2 font-mono text-ink-3">{i + 1}</td>
              <td className="px-3 py-2">
                <div className="text-xs text-ink-3">
                  {r.assetName}
                  {r.areaPath && ` · ${r.areaPath}`}
                </div>
                <div className="font-medium text-ink">{r.entityName}</div>
              </td>
              <td className="min-w-64 px-3 py-2">
                <p className="font-medium text-ink">{r.action}</p>
                <p className="mt-0.5 text-xs text-ink-3">{r.basis}</p>
              </td>
              <td className="px-3 py-2">
                <span
                  className={`whitespace-nowrap rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${TIMING[r.timing].className}`}
                >
                  {TIMING[r.timing].label}
                </span>
              </td>
              <td className="max-w-80 px-3 py-2">
                <TraceChips trace={r.trace} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Section>
  );
}

function EngineeringInfo({ scope }: { scope: OutageScope }) {
  const rows = scope.priorityAssets.flatMap((a) => a.records.map((r) => ({ ...r, assetName: a.name })));
  return (
    <Section
      id="engineering"
      title="Supporting engineering information"
      subtitle="Demo records attached to the equipment in scope. Documents are placeholders; files are not connected."
    >
      <Table head={["Asset", "Equipment", "Type", "Record", "Reference", "Date", ""]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-3">{r.assetName}</td>
            <td className="whitespace-nowrap px-3 py-2 text-ink">{r.entityName}</td>
            <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-2">{RECORD_KIND[r.kind]}</td>
            <td className="px-3 py-2 text-ink-2">{r.title}</td>
            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-ink-2">{r.reference}</td>
            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-ink-2">{formatDate(r.date)}</td>
            <td className="px-3 py-2 text-right print:hidden">
              <Link href={r.href} className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:underline">
                Open <ArrowRight size={12} aria-hidden />
              </Link>
            </td>
          </tr>
        ))}
      </Table>
    </Section>
  );
}

function Parts({ scope }: { scope: OutageScope }) {
  const rows = scope.priorityAssets.flatMap((a) => a.parts);
  return (
    <Section
      id="parts"
      title="Parts to consider having available"
      subtitle="Consider having available for inspection / contingency. Not replacement requirements. Fictional demo part numbers."
    >
      {rows.length === 0 ? (
        <p className="text-sm text-ink-3">No contingency parts suggested.</p>
      ) : (
        <Table head={["Demo part no.", "Description", "Reference", "Qty", "For", "Consideration", "Traceability"]}>
          {rows.map((p) => (
            <tr key={`${p.assetId}-${p.partNumber ?? p.description}`}>
              <td className="whitespace-nowrap px-3 py-2 font-mono font-medium text-ink">
                {p.partNumber ?? <span className="font-sans font-normal text-ink-3">Not assigned</span>}
              </td>
              <td className="px-3 py-2 text-ink-2">{p.description}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-ink-2">{p.reference ?? p.note ?? "—"}</td>
              <td className="px-3 py-2 text-right font-mono tabular text-ink">{p.quantity}</td>
              <td className="px-3 py-2">
                <div className="text-xs text-ink-3">{p.assetName}</div>
                <div className="text-ink">{p.entityName}</div>
              </td>
              <td className="px-3 py-2 text-xs text-ink-2">{p.consideration}</td>
              <td className="max-w-72 px-3 py-2">
                <TraceChips trace={p.trace} />
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------

export function OutageScopeView(props: OutageScopeViewProps) {
  const { customer, plant, units, outage, assets, checklist } = props;
  // Frozen telemetry snapshot; null during server render.
  const capture = useSyncExternalStore(subscribeCapture, getCapture, () => null);

  const scope = useMemo(() => {
    if (!capture) return null;
    const models = assets.map(({ records, recentTelemetry }) =>
      buildAssetModel(records, assessHealth(capture.frames[records.asset.id] ?? recentTelemetry)),
    );
    return generateOutageScope({ customer, plant, units, outage, models, checklist, generatedAt: capture.capturedAt });
  }, [capture, assets, checklist, customer, plant, units, outage]);

  const live = capture ? Object.values(capture.connection).some((c) => c !== "idle") : false;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/plants/${plant.id}`} className="text-sm text-ink-3 hover:text-ink">
          ← Back to {plant.name}
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => captureTelemetry()}
            className="inline-flex items-center gap-1.5 rounded border border-line-strong bg-panel px-3 py-1.5 text-sm font-medium text-ink-2 hover:text-ink"
          >
            <RefreshCw size={14} aria-hidden /> Refresh scope
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded bg-navy-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-navy-800"
          >
            <Printer size={14} aria-hidden /> Print / export preview
          </button>
        </div>
      </div>

      {!scope ? (
        <p className="rounded-md border border-line bg-panel p-8 text-center text-sm text-ink-3">Building outage scope…</p>
      ) : (
        <>
          <ScopeHeader scope={scope} live={live} />
          <ExecutiveSummary scope={scope} />
          {scope.priorityAssets.length > 0 && <PriorityOverview scope={scope} />}
          {scope.priorityAssets.map((a) => (
            <AssetDetail key={a.assetId} asset={a} />
          ))}
          <Inspections scope={scope} />
          {scope.priorityAssets.length > 0 && <EngineeringInfo scope={scope} />}
          <Parts scope={scope} />
          {scope.otherAssets.length > 0 && (
            <Section title="Assets without active condition indicators">
              <ul className="space-y-1.5">
                {scope.otherAssets.map((a) => (
                  <li key={a.assetId} className="flex flex-wrap items-center gap-3 rounded border border-line bg-panel px-3 py-2 text-sm">
                    <Link href={a.href} className="font-medium text-ink hover:underline">
                      {a.name}
                    </Link>
                    <StatusBadge status={a.status} size="sm" />
                    <span className="text-xs text-ink-3">{a.note}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <footer className="border-t border-line pt-4 text-xs leading-relaxed text-ink-3">
            <p>{PLANNING_NOTICE}</p>
            <p className="mt-1">
              {PROTOTYPE_NOTICE} Scope ID <span className="font-mono">{scope.id}</span>.
            </p>
          </footer>
        </>
      )}
    </main>
  );
}
