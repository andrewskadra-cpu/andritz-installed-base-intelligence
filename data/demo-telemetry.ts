/**
 * DEMO DATA — starting conditions for the telemetry simulator per asset.
 * Fictional values chosen to match the demo installed-base records.
 */

import type { SimulationProfile } from "@/lib/telemetry/simulator";

export const simulationProfiles: Record<string, Omit<SimulationProfile, "initialCycleCount">> = {
  // Gearbox already deteriorating and still worsening.
  "ik700-10482": { initialMode: "degrading", historyStartDegradation: 0.45, initialDegradation: 0.9 },
  // Operating at baseline.
  "ik700-10483": { initialMode: "normal", historyStartDegradation: 0, initialDegradation: 0 },
  // Gearbox normal; carriage travel slower than baseline.
  "ik700-10484": {
    initialMode: "normal",
    historyStartDegradation: 0,
    initialDegradation: 0,
    offsets: { travel_time: 9, motor_current: 0.2 },
  },
};
