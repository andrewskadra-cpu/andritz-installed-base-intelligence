/**
 * Telemetry types shared by every telemetry source (simulator today; edge
 * gateway / API / database later) and by the health engine.
 *
 * Production data flow:
 *   Physical sensor / PLC → Edge gateway → API / Database
 *     → TelemetryProvider → Health engine → UI
 */

import type { ConditionEvidence, HealthStatus, ViewerZone } from "./installed-base";

/** Continuous signals that are charted. */
export type TelemetrySignalKey = "vibration" | "gearbox_temperature" | "motor_current" | "travel_time";

/** One sample of every signal for one asset. */
export interface TelemetryFrame {
  timestamp: string;
  vibration: number;
  gearbox_temperature: number;
  motor_current: number;
  travel_time: number;
  /** Cumulative cycle counter. */
  cycleCount: number;
}

export interface TelemetrySignalDefinition {
  key: TelemetrySignalKey;
  label: string;
  unit: string;
  decimals: number;
  /** Established demo baseline (normal operating value). Not an engineering limit. */
  baseline: number;
}

export type TelemetryConnection = "idle" | "live" | "paused";

export interface TelemetrySource {
  kind: "simulator" | "api";
  label: string;
  /** True when readings are generated rather than measured. */
  synthetic: boolean;
}

export interface TelemetrySnapshot {
  connection: TelemetryConnection;
  /** Oldest first, capped at the provider's history length. */
  frames: TelemetryFrame[];
  intervalMs: number;
  /** Only present for simulated sources. */
  simulationMode: SimulationMode | null;
}

/**
 * Any source of live telemetry. UI code depends only on this interface, so the
 * simulator can be swapped for a real sensor API without touching components.
 */
export interface TelemetryProvider {
  readonly assetId: string;
  readonly source: TelemetrySource;
  subscribe(listener: () => void): () => void;
  getSnapshot(): TelemetrySnapshot;
  start(): void;
  pause(): void;
  dispose(): void;
}

export type SimulationMode = "normal" | "degrading";

/** Extra controls only a simulated provider offers (prototype demo controls). */
export interface SimulationControls {
  setMode(mode: SimulationMode): void;
  reset(): void;
}

export type SimulatedTelemetryProvider = TelemetryProvider & SimulationControls;

// ---------------------------------------------------------------------------
// Health engine output
// ---------------------------------------------------------------------------

export interface SignalAssessment {
  key: TelemetrySignalKey;
  latest: number;
  status: HealthStatus;
  /** Least-squares slope over recent samples, in units per sample. */
  trendPerSample: number;
  /** DETECTED statement for this signal, or null when within demo limits. */
  detection: string | null;
}

/** A condition the engine raises for one monitored region. */
export interface TelemetryFinding {
  zone: ViewerZone;
  status: HealthStatus;
  title: string;
  reasons: string[];
  /** Signals outside demo limits that raised this finding. */
  signals: TelemetrySignalKey[];
  /** Always contains observed, detected, inferred and confirmed entries. */
  evidence: ConditionEvidence[];
  recommendation: { priority: "planned" | "prompt"; action: string; rationale: string };
}

/** Asset-level summary pointing at the highest-priority monitored region. */
export interface AssessmentSummary {
  status: HealthStatus;
  /** Highest-priority top-level region, or null when everything is within limits. */
  priorityZone: ViewerZone | null;
  evidence: ConditionEvidence[];
}

export interface HealthAssessment {
  status: HealthStatus;
  reasons: string[];
  signals: Record<TelemetrySignalKey, SignalAssessment>;
  /** Live status per monitored region. */
  zones: Partial<Record<ViewerZone, HealthStatus>>;
  findings: TelemetryFinding[];
  summary: AssessmentSummary;
  latest: TelemetryFrame;
}
