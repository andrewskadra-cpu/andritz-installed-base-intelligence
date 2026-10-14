"use client";

import { useSyncExternalStore } from "react";
import type { StageTheme } from "@/components/3d/DigitalTwinStage";

/**
 * Per-viewer preference for the 3D stage presentation (dark digital twin vs
 * the previous light engineering background). Browser-local convenience
 * only; defaults to "dark" when storage is unavailable.
 */
const KEY = "ibis-3d-stage";
const EVENT = "ibis-3d-stage-change";

function read(): StageTheme {
  try {
    return localStorage.getItem(KEY) === "engineering" ? "engineering" : "dark";
  } catch {
    return "dark";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useStageTheme(): StageTheme {
  return useSyncExternalStore(subscribe, read, () => "dark");
}

export function setStageTheme(theme: StageTheme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage blocked: preference lasts for this page only */
  }
  window.dispatchEvent(new Event(EVENT));
}
