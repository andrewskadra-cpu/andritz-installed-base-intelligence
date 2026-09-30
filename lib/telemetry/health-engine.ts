/**
 * DEMO health engine. All telemetry threshold logic and the mapping of signals
 * to monitored regions live here — components must not compare readings
 * against limits or decide which signals belong to which equipment.
 *
 * Limits are illustrative demo values, not engineering or OEM limits. The engine
 * produces OBSERVED, DETECTED and INFERRED statements only. It can never
 * produce a CONFIRMED failure; confirmation comes from technician records.
 */

import type { ConditionEvidence, HealthStatus, ViewerZone } from "@/types/installed-base";
import type {
  AssessmentSummary,
  HealthAssessment,
  SignalAssessment,
  TelemetryFinding,
  TelemetryFrame,
  TelemetrySignalKey,
} from "@/types/telemetry";
import { SIGNAL_ORDER, TELEMETRY_SIGNALS, formatSignal } from "./signals";

interface SignalRule {
  attention: number;
  critical: number;
  /** Rising slope (units per sample) treated as an elevated trend. */
  trend: number;
  phrases: { attention: string; critical: string; trend: string };
}

const RULES: Record<TelemetrySignalKey, SignalRule> = {
  vibration: {
    attention: 2.8,
    critical: 4.5,
    trend: 0.03,
    phrases: {
      attention: "Vibration is above the established demo baseline",
      critical: "Vibration exceeds the demo critical limit",
      trend: "Vibration trend is rising",
    },
  },
  gearbox_temperature: {
    attention: 66,
    critical: 78,
    trend: 0.25,
    phrases: {
      attention: "Gearbox temperature is above the demo baseline",
      critical: "Gearbox temperature exceeds the demo critical limit",
      trend: "Gearbox temperature trend is elevated",
    },
  },
  motor_current: {
    attention: 4.4,
    critical: 5.0,
    trend: 0.02,
    phrases: {
      attention: "Motor current is above the demo baseline",
      critical: "Motor current exceeds the demo critical limit",
      trend: "Motor current trend is rising",
    },
  },
  travel_time: {
    attention: 95,
    critical: 105,
    trend: 0.25,
    phrases: {
      attention: "Travel time has increased from baseline",
      critical: "Travel time exceeds the demo critical limit",
      trend: "Travel time trend is rising",
    },
  },
};

/** Samples used for the trend slope. */
const TREND_WINDOW = 12;
/** This many signals past their attention limit at once escalate the overall status to critical. */
const MULTI_SIGNAL_ESCALATION = 3;

interface MonitoredRegion {
  zone: ViewerZone;
  /** Signals that determine this region's health. */
  signals: TelemetrySignalKey[];
  /** Additional signals shown for context but not used for this region's health. */
  relatedSignals: TelemetrySignalKey[];
  /** Top-level regions are candidates for the asset's "highest-priority area". */
  topLevel: boolean;
  label: string;
  title: string;
  inference: string;
  action: string;
}

const REGIONS: MonitoredRegion[] = [
  {
    zone: "gearbox",
    signals: ["vibration", "gearbox_temperature", "motor_current"],
    relatedSignals: [],
    topLevel: true,
    label: "Gearbox",
    title: "Gearbox condition deviation",
    inference: "Possible degradation within the gearbox assembly.",
    action: "Inspect the gearbox for noise, temperature, backlash and lubricant condition.",
  },
  {
    zone: "bearing",
    signals: ["vibration"],
    relatedSignals: ["gearbox_temperature"],
    topLevel: false,
    label: "Bearing",
    title: "Bearing vibration above baseline",
    inference: "Bearing-related degradation is possible.",
    action: "Inspect the bearing for play, noise and lubricant condition.",
  },
  {
    zone: "carriage",
    signals: ["motor_current", "travel_time"],
    relatedSignals: [],
    topLevel: true,
    label: "Carriage",
    title: "Carriage drive deviation",
    inference: "Possible carriage drag, track obstruction or drive loading.",
    action: "Inspect carriage wheels, track and drive for binding or debris.",
  },
];

/** Signals to display for a set of regions (health signals first, then related ones). */
export function signalsForZones(zones: Iterable<ViewerZone>): TelemetrySignalKey[] {
  const wanted = new Set<TelemetrySignalKey>();
  for (const zone of zones) {
    const region = REGIONS.find((r) => r.zone === zone);
    region?.signals.forEach((s) => wanted.add(s));
    region?.relatedSignals.forEach((s) => wanted.add(s));
  }
  return SIGNAL_ORDER.filter((s) => wanted.has(s));
}

const SEVERITY: Record<HealthStatus, number> = { healthy: 0, unknown: 1, attention: 2, critical: 3 };

export function worstStatus(statuses: HealthStatus[]): HealthStatus {
  return statuses.reduce<HealthStatus>((worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst), "healthy");
}

function severity(status: HealthStatus) {
  return SEVERITY[status];
}

function slope(values: number[]) {
  const n = values.length;
  if (n < 3) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY);
    den += (x - meanX) ** 2;
  });
  return num / den;
}

function assessSignal(key: TelemetrySignalKey, frames: TelemetryFrame[]): SignalAssessment {
  const rule = RULES[key];
  const latest = frames[frames.length - 1][key];
  const trendPerSample = slope(frames.slice(-TREND_WINDOW).map((f) => f[key]));

  let status: HealthStatus = "healthy";
  let detection: string | null = null;
  if (latest >= rule.critical) {
    status = "critical";
    detection = rule.phrases.critical;
  } else if (latest >= rule.attention) {
    status = "attention";
    detection = rule.phrases.attention;
  } else if (trendPerSample >= rule.trend) {
    status = "attention";
    detection = rule.phrases.trend;
  }
  return { key, latest, status, trendPerSample, detection };
}

const observedStatement = (key: TelemetrySignalKey, value: number) =>
  `${TELEMETRY_SIGNALS[key].label} = ${formatSignal(key, value)}`;

const CONFIRMED_NONE: ConditionEvidence = {
  level: "confirmed",
  statement: "No technician-confirmed mechanical failure.",
  source: "Service records",
  recordedAt: null,
};

function buildFinding(
  region: MonitoredRegion,
  signals: Record<TelemetrySignalKey, SignalAssessment>,
  latest: TelemetryFrame,
): TelemetryFinding | null {
  const involved = region.signals.map((k) => signals[k]).filter((s) => s.status !== "healthy");
  if (involved.length === 0) return null;
  const status = worstStatus(involved.map((s) => s.status));
  const reasons = involved.map((s) => s.detection!);

  const evidence: ConditionEvidence[] = [
    {
      level: "observed",
      statement: involved.map((s) => observedStatement(s.key, s.latest)).join(" · "),
      source: "Live demo telemetry · latest reading",
      recordedAt: latest.timestamp,
    },
    {
      level: "detected",
      statement: `${reasons.join("; ")}.`,
      source: "Demo health engine · baseline and trend rules",
      recordedAt: latest.timestamp,
    },
    {
      level: "inferred",
      statement: region.inference,
      source: "Pattern hypothesis · requires physical verification",
      recordedAt: null,
    },
    CONFIRMED_NONE,
  ];

  return {
    zone: region.zone,
    status,
    title: region.title,
    reasons,
    evidence,
    recommendation: {
      priority: status === "critical" ? "prompt" : "planned",
      action: region.action,
      rationale: `${reasons[0]}. The inferred cause needs physical verification.`,
    },
  };
}

function buildSummary(
  status: HealthStatus,
  findings: TelemetryFinding[],
  signals: Record<TelemetrySignalKey, SignalAssessment>,
  latest: TelemetryFrame,
): AssessmentSummary {
  const candidates = findings
    .filter((f) => REGIONS.find((r) => r.zone === f.zone)?.topLevel)
    .sort((a, b) => severity(b.status) - severity(a.status) || b.reasons.length - a.reasons.length);
  const priority = candidates[0];

  if (!priority) {
    return {
      status,
      priorityZone: null,
      evidence: [
        {
          level: "observed",
          statement: "All demo telemetry signals are within demo limits.",
          source: "Live demo telemetry · latest reading",
          recordedAt: latest.timestamp,
        },
        {
          level: "detected",
          statement: "No deviation from the demo baseline detected.",
          source: "Demo health engine",
          recordedAt: latest.timestamp,
        },
        { level: "inferred", statement: "No degradation pattern inferred.", source: "Demo health engine", recordedAt: null },
        CONFIRMED_NONE,
      ],
    };
  }

  const region = REGIONS.find((r) => r.zone === priority.zone)!;
  const elevated = SIGNAL_ORDER.filter((k) => signals[k].status !== "healthy");
  const values = elevated.map((k) => observedStatement(k, signals[k].latest)).join(", ");

  return {
    status,
    priorityZone: priority.zone,
    evidence: [
      {
        level: "observed",
        statement:
          elevated.length > 1 ? `Multiple demo telemetry signals are elevated: ${values}.` : `${values}.`,
        source: "Live demo telemetry · latest reading",
        recordedAt: latest.timestamp,
      },
      {
        level: "detected",
        statement: `${region.label}-related condition indicators are outside the demo baseline.`,
        source: "Demo health engine · baseline and trend rules",
        recordedAt: latest.timestamp,
      },
      {
        level: "inferred",
        statement: region.inference,
        source: "Pattern hypothesis · requires physical verification",
        recordedAt: null,
      },
      CONFIRMED_NONE,
    ],
  };
}

/** Assess the latest telemetry. Returns null until at least one frame exists. */
export function assessHealth(frames: TelemetryFrame[]): HealthAssessment | null {
  if (frames.length === 0) return null;
  const latest = frames[frames.length - 1];

  const signals = Object.fromEntries(SIGNAL_ORDER.map((k) => [k, assessSignal(k, frames)])) as Record<
    TelemetrySignalKey,
    SignalAssessment
  >;

  const zones: Partial<Record<ViewerZone, HealthStatus>> = {};
  for (const region of REGIONS) {
    zones[region.zone] = worstStatus(region.signals.map((k) => signals[k].status));
  }

  const deviating = SIGNAL_ORDER.filter((k) => signals[k].status !== "healthy");
  const reasons = deviating.map((k) => signals[k].detection!);
  let status = worstStatus(deviating.map((k) => signals[k].status));
  // Trend-only warnings do not count towards escalation.
  const pastLimit = SIGNAL_ORDER.filter((k) => signals[k].latest >= RULES[k].attention);
  if (pastLimit.length >= MULTI_SIGNAL_ESCALATION && status !== "critical") {
    status = "critical";
    reasons.push("Multiple signals exceed demo limits at the same time");
  }

  const findings = REGIONS.map((r) => buildFinding(r, signals, latest)).filter(
    (f): f is TelemetryFinding => f !== null,
  );

  return {
    status,
    reasons,
    signals,
    zones,
    findings,
    summary: buildSummary(status, findings, signals, latest),
    latest,
  };
}
