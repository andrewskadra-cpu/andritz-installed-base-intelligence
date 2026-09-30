"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { TelemetryFrame, TelemetryProvider, TelemetrySnapshot } from "@/types/telemetry";
import { assessHealth } from "./health-engine";
import { createTelemetryProvider, type TelemetryTarget } from "./telemetry-provider";

const noopSubscribe = () => () => {};

/**
 * Subscribes a component tree to live telemetry for one asset and runs the
 * health engine on every update. Server render and hydration use the recent
 * frames fetched on the server, so the first client render matches the HTML.
 */
export function useAssetTelemetry(target: TelemetryTarget, initialFrames: TelemetryFrame[]) {
  const [provider] = useState<TelemetryProvider | null>(() => createTelemetryProvider(target));
  const [initialSnapshot] = useState<TelemetrySnapshot>(() => ({
    connection: "idle",
    frames: initialFrames,
    intervalMs: 0,
    simulationMode: null,
  }));

  useEffect(() => () => provider?.dispose(), [provider]);

  const getInitial = () => initialSnapshot;
  const snapshot = useSyncExternalStore(
    provider?.subscribe ?? noopSubscribe,
    provider?.getSnapshot ?? getInitial,
    getInitial,
  );

  const assessment = useMemo(() => assessHealth(snapshot.frames), [snapshot.frames]);

  return { provider, snapshot, assessment };
}
