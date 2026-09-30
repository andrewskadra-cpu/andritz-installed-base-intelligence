/**
 * Telemetry provider entry point — the single place that decides where
 * telemetry comes from. Today every asset uses the simulator. When sensors are
 * connected, return an API/database-backed TelemetryProvider here instead and
 * read recent frames from that store; the UI and health engine stay unchanged.
 */

import { simulationProfiles } from "@/data/demo-telemetry";
import type { SimulatedTelemetryProvider, TelemetryFrame, TelemetryProvider } from "@/types/telemetry";
import { TelemetrySimulator } from "./simulator";

export interface TelemetryTarget {
  assetId: string;
  /** Last recorded cycle count from the installed-base record. */
  cycleCount: number;
}

/** Live stream for one asset (client side). */
export function createTelemetryProvider(target: TelemetryTarget): TelemetryProvider | null {
  const profile = simulationProfiles[target.assetId];
  if (!profile) return null;
  return new TelemetrySimulator(target.assetId, { ...profile, initialCycleCount: target.cycleCount });
}

/**
 * Most recent telemetry window for one asset (server side). Used for the
 * initial render and for plant/customer health summaries.
 */
export async function fetchRecentTelemetry(target: TelemetryTarget): Promise<TelemetryFrame[]> {
  const provider = createTelemetryProvider(target);
  if (!provider) return [];
  const { frames } = provider.getSnapshot();
  provider.dispose();
  return frames;
}

/** True when the provider exposes demo simulation controls. */
export function isSimulated(provider: TelemetryProvider): provider is SimulatedTelemetryProvider {
  return provider.source.kind === "simulator" && "setMode" in provider;
}
