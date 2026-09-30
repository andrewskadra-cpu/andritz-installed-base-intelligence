/**
 * Synthetic telemetry source for the prototype. It implements the same
 * TelemetryProvider interface a real sensor/API provider will implement.
 *
 * Signals are driven by a single degradation factor (0 = baseline, 1 = fully
 * degraded) that moves slowly each tick, plus small auto-correlated noise, so
 * values trend smoothly instead of jumping.
 */

import type {
  SimulatedTelemetryProvider,
  SimulationMode,
  TelemetryFrame,
  TelemetrySignalKey,
  TelemetrySnapshot,
  TelemetrySource,
} from "@/types/telemetry";
import { SIGNAL_ORDER, TELEMETRY_SIGNALS } from "./signals";

export interface SimulationProfile {
  initialMode: SimulationMode;
  /** Degradation at the start of the pre-filled history. */
  historyStartDegradation: number;
  /** Degradation at the most recent pre-filled reading. */
  initialDegradation: number;
  /** Constant per-signal offsets from baseline (e.g. an unrelated carriage issue). */
  offsets?: Partial<Record<TelemetrySignalKey, number>>;
  initialCycleCount: number;
}

export interface SimulatorOptions {
  intervalMs?: number;
  historyLength?: number;
  /** Degradation added per tick in DEGRADING mode. */
  degradationRate?: number;
  /** Degradation removed per tick in NORMAL mode. */
  recoveryRate?: number;
  seed?: number;
}

/** Change from baseline at full degradation, and how sharply each signal responds. */
const DEGRADED_DELTA: Record<TelemetrySignalKey, { delta: number; exponent: number; noise: number }> = {
  vibration: { delta: 3.0, exponent: 1.6, noise: 0.08 },
  gearbox_temperature: { delta: 22, exponent: 1.0, noise: 0.3 },
  motor_current: { delta: 0.9, exponent: 1.0, noise: 0.04 },
  travel_time: { delta: 12, exponent: 1.2, noise: 0.4 },
};

/** Temperature follows degradation with thermal lag. */
const THERMAL_LAG = 0.15;
const NOISE_MEMORY = 0.8;

/** Small deterministic PRNG so a reset replays the same sequence. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

export class TelemetrySimulator implements SimulatedTelemetryProvider {
  readonly source: TelemetrySource = { kind: "simulator", label: "Telemetry simulator", synthetic: true };

  private readonly intervalMs: number;
  private readonly historyLength: number;
  private readonly degradationRate: number;
  private readonly recoveryRate: number;
  private readonly seed: number;

  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private random = Math.random;
  private mode: SimulationMode = "normal";
  private degradation = 0;
  private thermal = 0;
  private noise = {} as Record<TelemetrySignalKey, number>;
  private cycleCount = 0;
  private snapshot!: TelemetrySnapshot;

  constructor(
    readonly assetId: string,
    private readonly profile: SimulationProfile,
    options: SimulatorOptions = {},
  ) {
    this.intervalMs = options.intervalMs ?? 1500;
    this.historyLength = options.historyLength ?? 60;
    this.degradationRate = options.degradationRate ?? 0.012;
    this.recoveryRate = options.recoveryRate ?? 0.025;
    this.seed = options.seed ?? 7;
    this.initialise();
  }

  // --- TelemetryProvider ----------------------------------------------------

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  start = () => {
    if (this.timer) return;
    this.timer = setInterval(this.tick, this.intervalMs);
    this.publish({ connection: "live" });
  };

  pause = () => {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.publish({ connection: "paused" });
  };

  dispose = () => {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.listeners.clear();
  };

  // --- SimulationControls ---------------------------------------------------

  setMode = (mode: SimulationMode) => {
    this.mode = mode;
    this.publish({ simulationMode: mode });
  };

  reset = () => {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.initialise();
    this.emit();
  };

  // --- Internals ------------------------------------------------------------

  private initialise() {
    const { historyStartDegradation, initialDegradation, initialMode, initialCycleCount } = this.profile;
    this.random = mulberry32(this.seed);
    this.mode = initialMode;
    this.degradation = historyStartDegradation;
    this.thermal = historyStartDegradation;
    this.noise = { vibration: 0, gearbox_temperature: 0, motor_current: 0, travel_time: 0 };

    // Pre-fill history so charts have context before the live stream starts.
    const count = this.historyLength;
    this.cycleCount = initialCycleCount - count;
    const now = Date.now();
    const frames: TelemetryFrame[] = [];
    for (let i = 0; i < count; i++) {
      const target =
        historyStartDegradation + ((initialDegradation - historyStartDegradation) * (i + 1)) / count;
      this.degradation = target;
      frames.push(this.nextFrame(new Date(now - (count - 1 - i) * this.intervalMs)));
    }

    this.snapshot = {
      connection: "idle",
      frames,
      intervalMs: this.intervalMs,
      simulationMode: this.mode,
    };
  }

  private gaussian() {
    const u = Math.max(this.random(), 1e-9);
    const v = this.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  private nextFrame(at: Date): TelemetryFrame {
    this.thermal += (this.degradation - this.thermal) * THERMAL_LAG;
    this.cycleCount += 1;

    const value = (key: TelemetrySignalKey) => {
      const { delta, exponent, noise } = DEGRADED_DELTA[key];
      const driver = key === "gearbox_temperature" ? this.thermal : this.degradation;
      this.noise[key] = NOISE_MEMORY * this.noise[key] + 0.6 * noise * this.gaussian();
      const raw =
        TELEMETRY_SIGNALS[key].baseline +
        (this.profile.offsets?.[key] ?? 0) +
        delta * Math.pow(driver, exponent) +
        this.noise[key];
      const f = 10 ** TELEMETRY_SIGNALS[key].decimals;
      return Math.round(raw * f) / f;
    };

    const frame = { timestamp: at.toISOString(), cycleCount: this.cycleCount } as TelemetryFrame;
    for (const key of SIGNAL_ORDER) frame[key] = value(key);
    return frame;
  }

  private tick = () => {
    const step = this.mode === "degrading" ? this.degradationRate : -this.recoveryRate;
    this.degradation = clamp01(this.degradation + step);
    const frames = [...this.snapshot.frames, this.nextFrame(new Date())].slice(-this.historyLength);
    this.publish({ frames });
  };

  private publish(patch: Partial<TelemetrySnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}
