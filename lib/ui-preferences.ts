"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny per-browser UI preferences (sidebar collapsed, equipment tree open).
 * Browser-local conveniences only; every read is guarded so blocked storage
 * simply falls back to the default.
 */
const EVENT = "ibis-ui-preference";

function read(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
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

export function useBooleanPreference(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const set = (next: boolean) => {
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {
      /* storage blocked: the preference is simply not kept */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [value, set];
}
