"use client";

/**
 * Presentation mode (?demo=1, cleared with ?demo=0). Remembered for the
 * browser tab session so it survives normal navigation. It only hides
 * prototype tooling (simulator mode switches, 3D mapping debug); demo-data
 * labels, disclaimers and all interactions are unchanged.
 */

import { useEffect, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";

const KEY = "ibis-presentation-mode";
const EVENT = "ibis-presentation-mode";

function read(): boolean {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

export function useDemoMode(): boolean {
  const param = useSearchParams().get("demo");
  useEffect(() => {
    if (param !== "1" && param !== "0") return;
    try {
      if (param === "1") window.sessionStorage.setItem(KEY, "1");
      else window.sessionStorage.removeItem(KEY);
    } catch {
      // Storage unavailable: the query parameter still applies to this page.
    }
    window.dispatchEvent(new Event(EVENT));
  }, [param]);
  const stored = useSyncExternalStore(subscribe, read, () => false);
  return param === "1" || (param !== "0" && stored);
}
