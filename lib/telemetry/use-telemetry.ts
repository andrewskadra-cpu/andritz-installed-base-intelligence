"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { TelemetryFrame, TelemetryProvider, TelemetrySnapshot } from "@/types/telemetry";
import { assessHealth } from "./health-engine";
import type { TelemetryTarget } from "./telemetry-provider";
import { getTelemetryProvider } from "./telemetry-registry";

const noopSubscribe = () => () => {};

/**
 * Subscribes a component tree to live telemetry for one asset and runs the
 * health engine on every update. The provider is shared through the registry,
 * so a running stream continues across page navigation. Server render and
 * hydration use the recent frames fetched on the server.
 */
export function useAssetTelemetry(target: TelemetryTarget, initialFrames: TelemetryFrame[]) {
  const [provider] = useState<TelemetryProvider | null>(() => getTelemetryProvider(target));
  const [initialSnapshot] = useState<TelemetrySnapshot>(() => ({
    connection: "idle",
    frames: initialFrames,
    intervalMs: 0,
    simulationMode: null,
  }));

  const getInitial = () => initialSnapshot;
  const snapshot = useSyncExternalStore(
    provider?.subscribe ?? noopSubscribe,
    provider?.getSnapshot ?? getInitial,
    getInitial,
  );

  const assessment = useMemo(() => assessHealth(snapshot.frames), [snapshot.frames]);

  return { provider, snapshot, assessment };
}
