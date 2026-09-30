import type { TelemetrySignalDefinition, TelemetrySignalKey } from "@/types/telemetry";

/** Display metadata and demo baselines for each charted signal. */
export const TELEMETRY_SIGNALS: Record<TelemetrySignalKey, TelemetrySignalDefinition> = {
  vibration: { key: "vibration", label: "Gearbox vibration RMS", unit: "mm/s", decimals: 2, baseline: 2.2 },
  gearbox_temperature: {
    key: "gearbox_temperature",
    label: "Gearbox temperature",
    unit: "°C",
    decimals: 1,
    baseline: 60,
  },
  motor_current: { key: "motor_current", label: "Motor current", unit: "A", decimals: 2, baseline: 4.0 },
  travel_time: { key: "travel_time", label: "Travel time", unit: "s", decimals: 1, baseline: 90 },
};

export const SIGNAL_ORDER: TelemetrySignalKey[] = [
  "vibration",
  "gearbox_temperature",
  "motor_current",
  "travel_time",
];

export function formatSignal(key: TelemetrySignalKey, value: number) {
  const def = TELEMETRY_SIGNALS[key];
  return `${value.toFixed(def.decimals)} ${def.unit}`;
}
