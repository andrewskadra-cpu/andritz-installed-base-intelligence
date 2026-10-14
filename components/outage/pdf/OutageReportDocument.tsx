/**
 * Draft outage planning report as a PDF document (@react-pdf/renderer).
 *
 * Rendered from structured report data (see lib/outage/outage-report.ts), not
 * from a screenshot. Only the built-in PDF fonts are used, so nothing is
 * fetched while generating. No PI sheet images, drawings or 3D geometry are
 * embedded: engineering references are listed as text only.
 */

import { Circle, Defs, Document, Font, LinearGradient, Page, Path, Rect, Stop, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

/** Style object accepted by react-pdf primitives. */
type Style = Parameters<typeof StyleSheet.create>[0][string];
import type { ReactNode } from "react";
import type { HealthStatus } from "@/types/installed-base";
import {
  EVIDENCE_LABEL,
  PARTS_DISCLAIMER,
  REPORT_DISCLAIMER,
  type OutageReport,
  type ReportAsset,
  type ReportComponentItem,
} from "@/lib/outage/outage-report";

// ---------------------------------------------------------------------------
// Text: the standard PDF fonts cover WinAnsi only, so map the few other
// characters the app uses (arrows, ≥, ✓ …) to plain equivalents.
// ---------------------------------------------------------------------------

const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const REPLACE: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "↑": "up",
  "↓": "down",
  "≥": ">=",
  "≤": "<=",
  "≈": "~",
  "✓": "",
  "✕": "x",
  "−": "-",
  " ": " ",
  " ": " ",
  "​": "",
};
export function pdfText(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let out = "";
  for (const ch of String(value)) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || ch === "\n" || WIN_ANSI_EXTRA.has(ch)) out += ch;
    else out += REPLACE[ch] ?? "?";
  }
  return out;
}

// Whole words only: no automatic hyphenation of names, statuses or part numbers.
Font.registerHyphenationCallback((word) => [word]);

// ---------------------------------------------------------------------------
// Palette and styles (print-friendly; navy headings, blue accents)
// ---------------------------------------------------------------------------

const C = {
  navy: "#0b1f3f",
  navy2: "#16335f",
  blue: "#1d5fc4",
  cyan: "#1597b8",
  ink: "#111827",
  ink2: "#374151",
  ink3: "#6b7280",
  line: "#d6dde7",
  soft: "#f3f6fa",
  softBlue: "#e8f0fc",
  white: "#ffffff",
};

const STATUS: Record<HealthStatus, { label: string; fg: string; bg: string }> = {
  critical: { label: "Critical", fg: "#b42318", bg: "#fdecea" },
  attention: { label: "Attention", fg: "#a15c07", bg: "#fdf3e1" },
  healthy: { label: "Healthy", fg: "#1f7a4a", bg: "#e7f5ed" },
  unknown: { label: "Unknown", fg: "#4b5563", bg: "#eef0f3" },
};

const EVIDENCE_COLOR = {
  observed: { fg: C.ink2, bg: "#eef0f3", border: "#c9d0da" },
  detected: { fg: C.blue, bg: C.softBlue, border: "#b8cdf0" },
  inferred: { fg: C.ink2, bg: C.white, border: "#9aa3af" },
  confirmed: { fg: "#1f7a4a", bg: "#e7f5ed", border: "#b4dcc5" },
  open: { fg: C.ink3, bg: C.soft, border: C.line },
};

const s = StyleSheet.create({
  page: { paddingTop: 64, paddingBottom: 58, paddingHorizontal: 42, fontFamily: "Helvetica", fontSize: 9, color: C.ink, lineHeight: 1.35 },
  header: {
    position: "absolute",
    top: 22,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 7,
    borderBottomWidth: 0.75,
    borderBottomColor: C.line,
  },
  headerText: { fontSize: 7.5, color: C.ink3 },
  headerStrong: { fontFamily: "Helvetica-Bold", color: C.navy },
  draftTag: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    color: "#a15c07",
    borderWidth: 0.75,
    borderColor: "#e3b86b",
    backgroundColor: "#fdf3e1",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 2,
    letterSpacing: 0.8,
  },
  footer: {
    position: "absolute",
    top: 841.89 - 22 - 26,
    height: 26,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 6,
    borderTopWidth: 0.75,
    borderTopColor: C.line,
    fontSize: 7,
    color: C.ink3,
  },
  h1: { fontFamily: "Helvetica-Bold", fontSize: 15, color: C.navy, marginBottom: 3 },
  h1Bar: { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1.5, borderBottomColor: C.navy },
  h1Num: { fontFamily: "Helvetica-Bold", fontSize: 15, color: C.blue, marginRight: 8 },
  sub: { fontSize: 8.5, color: C.ink3, marginTop: -6, marginBottom: 10 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 11, color: C.navy },
  h3: { fontFamily: "Helvetica-Bold", fontSize: 8, color: C.navy2, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 5 },
  p: { fontSize: 9.5, color: C.ink2, lineHeight: 1.5 },
  mono: { fontFamily: "Courier" },
  bold: { fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 18 },
  // tables
  // Rows carry their own side and bottom rules, so a table split across pages stays closed on both pages.
  table: {},
  tr: { flexDirection: "row", borderLeftWidth: 0.75, borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: C.line },
  th: {
    flexDirection: "row",
    backgroundColor: C.navy,
    borderTopLeftRadius: 2.5,
    borderTopRightRadius: 2.5,
  },
  thCell: { paddingHorizontal: 6, paddingVertical: 5, fontFamily: "Helvetica-Bold", fontSize: 7, color: C.white, letterSpacing: 0.4, textTransform: "uppercase" },
  td: { paddingHorizontal: 6, paddingVertical: 5, fontSize: 8.5, color: C.ink },
  muted: { color: C.ink3, fontSize: 7.5 },
  pill: { fontFamily: "Helvetica-Bold", fontSize: 6.5, letterSpacing: 0.6, textTransform: "uppercase", paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 2 },
  box: { borderWidth: 0.75, borderColor: C.line, borderRadius: 3, padding: 10, backgroundColor: C.soft },
  notice: { borderLeftWidth: 3, borderLeftColor: "#d48a1a", backgroundColor: "#fdf6ea", padding: 10, borderRadius: 2 },
});

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function T({ children, style }: { children: string | number | null | undefined; style?: Style | Style[] }) {
  return <Text style={style}>{pdfText(children)}</Text>;
}

function StatusPill({ status }: { status: HealthStatus }) {
  const m = STATUS[status];
  return (
    <View style={{ flexDirection: "row", alignSelf: "flex-start" }}>
      <Text style={[s.pill, { color: m.fg, backgroundColor: m.bg }]}>{m.label}</Text>
    </View>
  );
}

function StatusDot({ status }: { status: HealthStatus }) {
  return <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: STATUS[status].fg, marginRight: 4, marginTop: 2.5 }} />;
}

function Heading({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <View minPresenceAhead={90}>
      <View style={s.h1Bar}>
        <Text style={s.h1Num}>{n}</Text>
        <T style={[s.h1, { marginBottom: 0 }]}>{title}</T>
      </View>
      {sub && <T style={s.sub}>{sub}</T>}
    </View>
  );
}

interface Col {
  title: string;
  width: string;
  align?: "right";
}
function Table({ cols, rows }: { cols: Col[]; rows: ReactNode[][] }) {
  return (
    <View style={s.table}>
      <View style={s.th} wrap={false} fixed>
        {cols.map((c) => (
          <View key={c.title} style={{ width: c.width }}>
            <T style={[s.thCell, c.align ? { textAlign: "right" } : {}]}>{c.title}</T>
          </View>
        ))}
      </View>
      {rows.map((cells, i) => (
        <View key={i} style={[s.tr, i % 2 === 1 ? { backgroundColor: "#f8fafc" } : {}]} wrap={false}>
          {cells.map((cell, j) => (
            <View key={j} style={[s.td, { width: cols[j].width }, cols[j].align ? { alignItems: "flex-end" } : {}]}>
              {typeof cell === "string" || typeof cell === "number" ? <T>{cell}</T> : cell}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function Field({ label, value, mono, width = "50%" }: { label: string; value: string; mono?: boolean; width?: string }) {
  return (
    <View style={{ width, paddingRight: 10, marginBottom: 8 }}>
      <T style={{ fontSize: 6.8, color: C.ink3, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 1.5 }}>{label}</T>
      <T style={[{ fontSize: 9.5, color: C.ink }, mono ? s.mono : s.bold]}>{value}</T>
    </View>
  );
}

/** The IBIS product mark used in the application header (same geometry, drawn for print). */
function IbisMark({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1d3a66" />
          <Stop offset="1" stopColor="#0d1a30" />
        </LinearGradient>
      </Defs>
      <Rect x="0.5" y="0.5" width="39" height="39" rx="10" fill="url(#bg)" stroke="#2f4a73" />
      <Circle cx="20" cy="20" r="10.5" fill="none" stroke="#30a8f0" strokeWidth={2} strokeDasharray="4.1 2.5" />
      <Path d="M20 13.5v13M14.4 23.2 20 20l5.6 3.2" fill="none" stroke="#f3f7fc" strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx="20" cy="20" r="2.6" fill="#30cbe8" />
      <Circle cx="20" cy="13.5" r="1.6" fill="#f3f7fc" />
      <Circle cx="14.4" cy="23.2" r="1.6" fill="#f3f7fc" />
      <Circle cx="25.6" cy="23.2" r="1.6" fill="#f3f7fc" />
    </Svg>
  );
}

function Footer({ report }: { report: OutageReport }) {
  return (
    <>
    <Text
      fixed
      render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      style={{ position: "absolute", top: 841.89 - 22 - 20, right: 42, width: 90, textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 8, color: C.navy }}
    />
    <View style={s.footer} fixed>
      <View style={{ width: "80%" }}>
        <T>{`IBIS Draft Outage Planning Report · ${report.plant} · ${report.units} · Generated ${report.generatedLabel}`}</T>
        <T>Synthetic demonstration data · Draft planning suggestions only · Not a work order or authorization to perform work</T>
      </View>
    </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Cover
// ---------------------------------------------------------------------------

function Cover({ report, notices }: { report: OutageReport; notices: string[] }) {
  return (
    <Page size="A4" style={[s.page, { paddingTop: 0, paddingHorizontal: 0 }]}>
      <View style={{ backgroundColor: C.navy, paddingHorizontal: 42, paddingTop: 30, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <IbisMark />
          <View style={{ marginLeft: 10 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8, color: "#b9c7dc", letterSpacing: 2.2 }}>ANDRITZ</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: C.white }}>IBIS</Text>
          </View>
        </View>
        <View style={{ marginTop: 26 }}>
          <Text style={{ fontSize: 11, lineHeight: 1.2, color: "#9fd8ea", letterSpacing: 0.4 }}>Installed-Base Intelligence System</Text>
        </View>
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 26, lineHeight: 1.2, color: C.white }}>Draft Outage Planning Report</Text>
        </View>
        <View style={{ marginTop: 4 }}>
          <T style={{ fontSize: 11.5, lineHeight: 1.3, color: "#d4deec" }}>{report.scopeName}</T>
        </View>
        <View style={{ flexDirection: "row", marginTop: 14 }}>
          <Text style={[s.pill, { fontSize: 7.5, color: "#7a4304", backgroundColor: "#ffd78a", paddingHorizontal: 6, paddingVertical: 2.5 }]}>
            Draft · for review
          </Text>
          <Text
            style={[s.pill, { fontSize: 7.5, color: "#cfe7f5", backgroundColor: C.navy2, paddingHorizontal: 6, paddingVertical: 2.5, marginLeft: 6 }]}
          >
            Synthetic demonstration data
          </Text>
        </View>
      </View>
      <View style={{ height: 3, backgroundColor: C.blue }} />

      <View style={{ paddingHorizontal: 42, paddingTop: 18 }}>
        <T style={s.h3}>Report identification</T>
        <View style={[s.box, { flexDirection: "row", flexWrap: "wrap", paddingBottom: 2, backgroundColor: C.white }]}>
          <Field label="Customer" value={report.customer} />
          <Field label="Plant" value={report.plant} />
          <Field label="Unit" value={report.units} />
          <Field label="Planned outage window (demo)" value={report.window} />
          <Field label="Generated" value={report.generatedLabel} mono />
          <Field label={report.liveSession ? "Telemetry as of (live session)" : "Telemetry as of"} value={report.telemetryAsOf} mono />
          <Field label="Report status" value="Draft" />
          <Field label="Data source" value="Synthetic demonstration data" />
          <Field label="Report / scope ID" value={report.scopeId} mono width="100%" />
        </View>

        <View style={[s.notice, { marginTop: 12 }]}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#7a4304", marginBottom: 3 }}>Decision-support notice</Text>
          <T style={[s.p, { fontSize: 9, color: C.ink }]}>{REPORT_DISCLAIMER}</T>
          {notices.map((n) => (
            <T key={n} style={[s.p, { fontSize: 8, marginTop: 4 }]}>{n}</T>
          ))}
        </View>

        <T style={[s.h3, { marginTop: 12 }]}>Evidence levels used in this report</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {(Object.keys(EVIDENCE_LABEL) as (keyof typeof EVIDENCE_LABEL)[]).map((lvl) => (
            <View key={lvl} style={{ width: "50%", flexDirection: "row", alignItems: "flex-start", marginBottom: 5, paddingRight: 8 }}>
              <EvidencePill level={lvl} open={false} />
              <T style={{ fontSize: 8.5, color: C.ink2, marginLeft: 6, flex: 1 }}>{EVIDENCE_LABEL[lvl].hint}</T>
            </View>
          ))}
        </View>
        <T style={{ fontSize: 8, color: C.ink3, marginTop: 2 }}>
          Inferred statements are possible explanations, not diagnoses. A condition indicator does not prove a mechanical failure; only
          technician-verified findings are marked confirmed.
        </T>

        <T style={[s.h3, { marginTop: 12 }]}>Contents</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16 }}>
        {[
          "Executive summary",
          "Priority assets",
          "Component-level inspection considerations",
          "Suggested inspection considerations",
          "Parts to consider having available",
          "Engineering references",
          ...(report.otherAssets.length > 0 ? ["Assets without active condition indicators"] : []),
        ].map((t, i) => (
          <View key={t} style={{ width: "48%", flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
            <Text style={{ width: 18, fontFamily: "Helvetica-Bold", color: C.blue }}>{i + 1}</Text>
            <T style={{ color: C.ink }}>{t}</T>
          </View>
        ))}
        </View>
      </View>
      <Footer report={report} />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function ExecutiveSummary({ report }: { report: OutageReport }) {
  const r = report.summary;
  const tiles: { label: string; value: number; tone?: HealthStatus }[] = [
    { label: "Assets reviewed", value: r.assetsReviewed },
    { label: "Critical assets", value: r.criticalAssets, tone: "critical" },
    { label: "Attention assets", value: r.attentionAssets, tone: "attention" },
    { label: "Healthy assets", value: r.healthyAssets, tone: "healthy" },
    { label: "Active condition indicators", value: r.activeIndicators },
    { label: "Components suggested for review", value: r.componentsForReview },
    { label: "Suggested inspection considerations", value: r.inspectionConsiderations },
    { label: "Parts to consider having available", value: r.partsToConsider },
  ];
  return (
    <View style={s.section}>
      <Heading n={1} title="Executive summary" sub={`Snapshot of the draft outage scope generated ${report.generatedLabel}.`} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -3 }}>
        {tiles.map((t) => (
          <View key={t.label} style={{ width: "25%", padding: 3 }}>
            <View
              style={{
                borderWidth: 0.75,
                borderColor: C.line,
                borderLeftWidth: 3,
                borderLeftColor: t.tone ? STATUS[t.tone].fg : C.blue,
                borderRadius: 2,
                paddingHorizontal: 8,
                paddingVertical: 7,
                minHeight: 52,
              }}
            >
              <T style={{ fontSize: 6.8, color: C.ink3, letterSpacing: 0.4, textTransform: "uppercase" }}>{t.label}</T>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 18, color: t.tone ? STATUS[t.tone].fg : C.navy, marginTop: 3 }}>{t.value}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={[s.box, { marginTop: 10, backgroundColor: C.softBlue, borderColor: "#c7d8f3" }]}>
        <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5, color: C.navy, marginBottom: 3 }}>Highest-priority condition</Text>
        <T style={s.p}>{report.headline}</T>
        {report.assets[0]?.items[0] && (
          <T style={[s.p, { marginTop: 4 }]}>
            {`Basis: ${report.assets[0].items[0].title} on ${report.assets[0].items[0].entityName}. ${
              report.assets[0].items[0].evidence.find((e) => e.level === "detected")?.statement ?? ""
            } ${report.assets[0].items[0].technicianConfirmed ? "A technician-confirmed finding is on record." : "Not technician-confirmed."}`}
          </T>
        )}
      </View>
    </View>
  );
}

function PriorityAssets({ report }: { report: OutageReport }) {
  return (
    <View style={s.section}>
      <Heading n={2} title="Priority assets" sub="Ranked by health status, then number of active condition indicators (same order as the application)." />
      {report.assets.length === 0 ? (
        <T style={s.p}>No reviewed asset shows active condition indicators.</T>
      ) : (
        <Table
          cols={[
            { title: "#", width: "5%" },
            { title: "Equipment", width: "21%" },
            { title: "Location", width: "16%" },
            { title: "Health", width: "13%" },
            { title: "Potential area of concern", width: "15%" },
            { title: "Detected condition indicators", width: "21%" },
            { title: "Consid.", width: "9%", align: "right" },
          ]}
          rows={report.assets.map((a) => [
            <T key="r" style={[s.mono, { color: C.ink3 }]}>{a.rank}</T>,
            <View key="a">
              <T style={s.bold}>{a.name}</T>
              <T style={s.muted}>{`Model ${a.model} · S/N ${a.serialNumber}`}</T>
              <T style={s.muted}>{a.equipmentType}</T>
            </View>,
            a.location,
            <StatusPill key="s" status={a.status} />,
            a.area ? (
              <View key="c" style={{ flexDirection: "row" }}>
                <StatusDot status={a.area.status} />
                <T style={{ flex: 1 }}>{a.area.name}</T>
              </View>
            ) : (
              "–"
            ),
            <View key="d">
              {a.detections.length === 0 ? <T style={s.muted}>–</T> : a.detections.map((d) => <T key={d} style={{ fontSize: 8 }}>{d}</T>)}
            </View>,
            <T key="n" style={[s.mono, s.bold]}>{a.considerationCount}</T>,
          ])}
        />
      )}
    </View>
  );
}

function EvidencePill({ level, open }: { level: keyof typeof EVIDENCE_LABEL; open: boolean }) {
  const c = open ? EVIDENCE_COLOR.open : EVIDENCE_COLOR[level];
  return (
    <View style={{ width: 62 }}>
      <Text
        style={[
          s.pill,
          {
            color: c.fg,
            backgroundColor: c.bg,
            borderWidth: 0.75,
            borderColor: c.border,
            borderStyle: level === "inferred" ? "dashed" : "solid",
            textAlign: "center",
          },
        ]}
      >
        {EVIDENCE_LABEL[level].label}
      </Text>
    </View>
  );
}

function ComponentCard({ asset, item }: { asset: ReportAsset; item: ReportComponentItem }) {
  const st = STATUS[item.status];
  return (
    <View wrap={false} style={{ borderWidth: 0.75, borderColor: C.line, borderLeftWidth: 3, borderLeftColor: st.fg, borderRadius: 2, marginBottom: 10 }}>
      <View
        wrap={false}
        style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: C.soft, paddingHorizontal: 9, paddingVertical: 6, borderBottomWidth: 0.75, borderBottomColor: C.line }}
      >
        <View style={{ flex: 1, paddingRight: 8 }}>
          <T style={[s.h2, { fontSize: 10.5 }]}>{item.entityName}</T>
          <T style={s.muted}>{`Condition basis: ${item.title}`}</T>
        </View>
        <StatusPill status={item.status} />
      </View>
      <View style={{ paddingHorizontal: 9, paddingTop: 8, flexDirection: "row", flexWrap: "wrap" }} wrap={false}>
        <Field label="Parent equipment" value={`${asset.name} (S/N ${asset.serialNumber})`} />
        <Field label="Assembly / component" value={[item.path, item.entityName].filter(Boolean).join(" › ")} />
        <Field label="Engineering reference" value={item.reference ?? "Not assigned"} mono={Boolean(item.reference)} />
        <Field label="Demo part number" value={item.partNumber ?? "Not assigned"} mono={Boolean(item.partNumber)} />
      </View>
      <View style={{ paddingHorizontal: 9 }}>
        <T style={[s.h3, { marginBottom: 3 }]}>Evidence and reasoning</T>
        {item.evidence.map((ev) => (
          <View key={ev.level} style={{ flexDirection: "row", paddingVertical: 4, borderTopWidth: 0.5, borderTopColor: C.line }} wrap={false}>
            <EvidencePill level={ev.level} open={ev.open} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <T style={{ fontSize: 8.8, color: ev.level === "inferred" ? C.ink2 : C.ink, fontFamily: ev.level === "inferred" ? "Helvetica-Oblique" : "Helvetica" }}>
                {ev.statement}
              </T>
              <T style={{ fontSize: 7.3, color: C.ink3 }}>
                {ev.open ? `${ev.source} · No technician confirmation on record` : ev.source}
              </T>
            </View>
          </View>
        ))}
      </View>
      <View style={{ paddingHorizontal: 9, paddingTop: 6, paddingBottom: 8 }} wrap={false}>
        <T style={[s.h3, { marginBottom: 3 }]}>Suggested inspection consideration</T>
        {item.considerations.length === 0 ? (
          <T style={s.muted}>No component-specific consideration; see the asset-level considerations in section 4.</T>
        ) : (
          item.considerations.map((c, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 3 }}>
              <Text style={{ width: 9, color: C.blue, fontFamily: "Helvetica-Bold" }}>•</Text>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>{c.action}</T>
                <T style={s.muted}>{`Suggested timing: ${c.timing} · ${c.basis}`}</T>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function ComponentConsiderations({ report }: { report: OutageReport }) {
  return (
    <View style={s.section} break>
      <Heading
        n={3}
        title="Component-level inspection considerations"
        sub="Per asset: condition indicator snapshot, then each component with active indicators and its OBSERVED / DETECTED / INFERRED / CONFIRMED evidence."
      />
      {report.assets.map((a, idx) => (
        <View key={a.name} break={idx > 0}>
          <View
            minPresenceAhead={160}
            style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.navy, borderRadius: 2, paddingHorizontal: 9, paddingVertical: 6, marginBottom: 8 }}
          >
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, color: "#9fd8ea", marginRight: 8 }}>#{a.rank}</Text>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: C.white }}>{a.name}</T>
              <T style={{ fontSize: 7.5, color: "#c3cfe0" }}>{`Model ${a.model} · S/N ${a.serialNumber} · ${a.equipmentType} · ${a.location}`}</T>
            </View>
            <StatusPill status={a.status} />
          </View>
          {a.area && (
            <T style={[s.p, { marginBottom: 6 }]}>{`Potential area of concern: ${a.area.name} (${STATUS[a.area.status].label}).`}</T>
          )}

          <T style={s.h3}>Condition indicators (demo telemetry snapshot)</T>
          <View style={{ marginBottom: 10 }}>
            <Table
              cols={[
                { title: "Signal", width: "32%" },
                { title: "Value", width: "18%", align: "right" },
                { title: "Status", width: "16%" },
                { title: "Detection", width: "34%" },
              ]}
              rows={a.signals.map((g) => [
                g.label,
                <T key="v" style={s.mono}>{g.value}</T>,
                <StatusPill key="s" status={g.status} />,
                <T key="d" style={g.detection ? {} : s.muted}>{g.detection ?? "Within demo limits"}</T>,
              ])}
            />
          </View>

          {a.items.map((item) => (
            <ComponentCard key={`${item.entityName}-${item.title}`} asset={a} item={item} />
          ))}

          {a.componentsForReview.length > 0 && (
            <View wrap={false} style={{ marginBottom: 6 }}>
              <T style={s.h3}>Components suggested for review</T>
              {a.componentsForReview.map((c) => (
                <View key={c.name} style={{ flexDirection: "row", paddingVertical: 3, borderTopWidth: 0.5, borderTopColor: C.line }}>
                  <StatusDot status={c.status} />
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 8.8 }}>{`${c.name} · in ${c.parentName}`}</T>
                    <T style={s.muted}>{`${c.ids} · ${c.reason}`}</T>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

function Inspections({ report }: { report: OutageReport }) {
  return (
    <View style={s.section} break>
      <Heading
        n={4}
        title="Suggested inspection considerations"
        sub="Demo suggestions for technician verification. Not a diagnosis and not an instruction to repair or replace."
      />
      {report.inspections.length === 0 ? (
        <T style={s.p}>No inspection considerations beyond routine outage checks.</T>
      ) : (
        <Table
          cols={[
            { title: "#", width: "5%" },
            { title: "Equipment", width: "22%" },
            { title: "Consideration", width: "37%" },
            { title: "Timing", width: "13%" },
            { title: "Traceability", width: "23%" },
          ]}
          rows={report.inspections.map((r) => [
            <T key="n" style={[s.mono, { color: C.ink3 }]}>{r.n}</T>,
            <View key="e">
              <T style={s.muted}>{r.equipment}</T>
              <T style={s.bold}>{r.entityName}</T>
            </View>,
            <View key="c">
              <T style={{ fontFamily: "Helvetica-Bold" }}>{r.action}</T>
              <T style={s.muted}>{r.basis}</T>
            </View>,
            r.timing,
            <View key="t">
              {r.trace.map((t) => (
                <T key={t} style={{ fontSize: 7.3, color: C.ink2 }}>{`• ${t}`}</T>
              ))}
            </View>,
          ])}
        />
      )}
    </View>
  );
}

function Parts({ report }: { report: OutageReport }) {
  return (
    <View style={s.section}>
      <Heading
        n={5}
        title="Parts to consider having available"
        sub="For inspection / contingency planning only. Demo part numbers are fictional; quantities are BOM line quantities, not requested quantities. Identification, suitability and availability of every line require confirmation."
      />
      {report.parts.length === 0 ? (
        <T style={s.p}>No contingency parts suggested.</T>
      ) : (
        <Table
          cols={[
            { title: "Description", width: "19%" },
            { title: "Demo part no.", width: "15%" },
            { title: "PI reference", width: "14%" },
            { title: "BOM qty", width: "8%", align: "right" },
            { title: "For", width: "19%" },
            { title: "Notes / verification", width: "25%" },
          ]}
          rows={report.parts.map((p) => [
            <T key="d" style={s.bold}>{p.description}</T>,
            <T key="p" style={p.partNumber ? s.mono : s.muted}>{p.partNumber ?? "Not assigned"}</T>,
            <T key="r" style={p.reference ? s.mono : s.muted}>{p.reference ?? "–"}</T>,
            <T key="q" style={s.mono}>{p.quantity}</T>,
            <View key="f">
              <T style={s.muted}>{p.assetName}</T>
              <T>{p.entityName}</T>
            </View>,
            <View key="n">
              {p.note && <T style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#a15c07" }}>{p.note}</T>}
              <T style={{ fontSize: 7.8, color: C.ink2 }}>{p.consideration}</T>
            </View>,
          ])}
        />
      )}
      <View style={[s.notice, { marginTop: 8 }]} wrap={false}>
        <T style={{ fontSize: 8.5, color: C.ink }}>{PARTS_DISCLAIMER}</T>
      </View>
    </View>
  );
}

function References({ report }: { report: OutageReport }) {
  return (
    <View style={s.section}>
      <Heading
        n={6}
        title="Engineering references"
        sub="Documents cited by the draft planning suggestions. Listed as references only: no drawing, PI sheet or binder page is embedded in this report."
      />
      {report.references.length === 0 ? (
        <T style={s.p}>No engineering document item is referenced by the current suggestions.</T>
      ) : (
        <Table
          cols={[
            { title: "Reference", width: "30%" },
            { title: "Document", width: "34%" },
            { title: "Cited for", width: "36%" },
          ]}
          rows={report.references.map((r) => [
            <T key="l" style={[s.mono, s.bold]}>{r.label}</T>,
            <T key="t">{[r.document, r.title, r.item ? `Item ${r.item}` : null].filter(Boolean).join(" · ")}</T>,
            <View key="u">
              {r.usedFor.map((u) => (
                <T key={u} style={{ fontSize: 8 }}>{u}</T>
              ))}
            </View>,
          ])}
        />
      )}

      {report.records.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <T style={s.h3}>Supporting engineering and service records (demo placeholders)</T>
          <Table
            cols={[
              { title: "Equipment", width: "24%" },
              { title: "Type", width: "14%" },
              { title: "Record", width: "30%" },
              { title: "Reference", width: "18%" },
              { title: "Date", width: "14%" },
            ]}
            rows={report.records.map((r) => [
              <View key="e">
                <T style={s.muted}>{r.assetName}</T>
                <T>{r.entityName}</T>
              </View>,
              r.kind,
              r.title,
              <T key="r" style={[s.mono, { fontSize: 7.5 }]}>{r.reference}</T>,
              <T key="d" style={[s.mono, { fontSize: 7.5 }]}>{r.date}</T>,
            ])}
          />
        </View>
      )}
    </View>
  );
}

function OtherAssets({ report }: { report: OutageReport }) {
  if (report.otherAssets.length === 0) return null;
  return (
    <View style={s.section}>
      <Heading n={7} title="Assets without active condition indicators" />
      <Table
        cols={[
          { title: "Equipment", width: "30%" },
          { title: "Health", width: "15%" },
          { title: "Note", width: "55%" },
        ]}
        rows={report.otherAssets.map((a) => [<T key="n" style={s.bold}>{a.name}</T>, <StatusPill key="s" status={a.status} />, a.note])}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------

export function OutageReportDocument({ report, notices }: { report: OutageReport; notices: string[] }) {
  return (
    <Document
      title={pdfText(`IBIS Draft Outage Planning Report · ${report.plant} · ${report.units}`)}
      author="IBIS prototype (synthetic demonstration data)"
      subject="Draft outage planning suggestions"
      creator="IBIS · Installed-Base Intelligence System"
      producer="IBIS"
    >
      <Cover report={report} notices={notices} />
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <Text style={s.headerText}>
            <Text style={s.headerStrong}>IBIS</Text>
            {pdfText(`  ·  Draft Outage Planning Report  ·  ${report.customer} · ${report.plant} · ${report.units}`)}
          </Text>
          <Text style={s.draftTag}>DRAFT</Text>
        </View>
        <ExecutiveSummary report={report} />
        <PriorityAssets report={report} />
        <ComponentConsiderations report={report} />
        <Inspections report={report} />
        <Parts report={report} />
        <References report={report} />
        <OtherAssets report={report} />
        <View style={[s.notice, { marginTop: 4 }]} wrap={false}>
          <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5, color: "#7a4304", marginBottom: 3 }}>Decision-support notice</Text>
          <T style={[s.p, { fontSize: 9, color: C.ink }]}>{REPORT_DISCLAIMER}</T>
          {notices.map((n) => (
            <T key={n} style={[s.p, { fontSize: 8, marginTop: 4 }]}>{n}</T>
          ))}
        </View>
        <Footer report={report} />
      </Page>
    </Document>
  );
}
