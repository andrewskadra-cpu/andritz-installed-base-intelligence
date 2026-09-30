/**
 * Browser-side registry of live telemetry providers, one per asset. Providers
 * outlive page navigation so a stream started on the asset page is still the
 * source of truth when the user builds an outage scope.
 *
 * Also holds a "capture": a frozen copy of every provider's recent frames,
 * taken when the user builds or refreshes an outage scope, so the generated
 * scope is a stable snapshot rather than a moving target.
 */

import type { TelemetryConnection, TelemetryFrame, TelemetryProvider } from "@/types/telemetry";
import { createTelemetryProvider, type TelemetryTarget } from "./telemetry-provider";

const providers = new Map<string, TelemetryProvider>();

/** Shared provider for an asset in the browser; a throwaway one on the server. */
export function getTelemetryProvider(target: TelemetryTarget): TelemetryProvider | null {
  if (typeof window === "undefined") return createTelemetryProvider(target);
  let provider = providers.get(target.assetId);
  if (!provider) {
    provider = createTelemetryProvider(target) ?? undefined;
    if (provider) providers.set(target.assetId, provider);
  }
  return provider ?? null;
}

export interface TelemetryCapture {
  capturedAt: string;
  /** Frames per asset id, only for assets with a live provider in this session. */
  frames: Record<string, TelemetryFrame[]>;
  connection: Record<string, TelemetryConnection>;
}

let capture: TelemetryCapture | null = null;
const captureListeners = new Set<() => void>();

function takeCapture(): TelemetryCapture {
  const frames: TelemetryCapture["frames"] = {};
  const connection: TelemetryCapture["connection"] = {};
  for (const [assetId, provider] of providers) {
    const snapshot = provider.getSnapshot();
    frames[assetId] = snapshot.frames;
    connection[assetId] = snapshot.connection;
  }
  return { capturedAt: new Date().toISOString(), frames, connection };
}

/** Freeze current telemetry for all assets (Build / Refresh Outage Scope). */
export function captureTelemetry() {
  capture = takeCapture();
  captureListeners.forEach((l) => l());
}

export function subscribeCapture(listener: () => void) {
  captureListeners.add(listener);
  return () => {
    captureListeners.delete(listener);
  };
}

/** Latest capture, taking one on first use (e.g. direct page load). */
export function getCapture(): TelemetryCapture {
  if (!capture) capture = takeCapture();
  return capture;
}
