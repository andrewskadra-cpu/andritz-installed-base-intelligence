"use client";

import { useDemoMode } from "@/lib/demo-mode";

/** Records ?demo=1 / ?demo=0 on any page so presentation mode follows navigation. */
export function DemoModeSync() {
  useDemoMode();
  return null;
}
