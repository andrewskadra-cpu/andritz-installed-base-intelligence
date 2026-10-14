"use client";

import Link from "next/link";
import { MonitorPlay, X } from "lucide-react";
import { useDemoMode } from "@/lib/demo-mode";

/**
 * Entry point into presentation (demo) mode: opens the welcome screen with
 * ?demo=1, from where "Enter IBIS" lands on the demo asset with live
 * telemetry running. When demo mode is already on, offers a way out.
 */
export function DemoModeButton() {
  const demo = useDemoMode();
  if (demo) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 py-1 pl-3 pr-1 text-xs font-semibold text-cyan">
        <span className="size-2 rounded-full bg-cyan motion-safe:animate-pulse" aria-hidden />
        Demo mode on
        <Link
          href="/overview?demo=0"
          className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 font-medium text-ink-2 transition-colors hover:bg-white/10 hover:text-ink"
        >
          <X size={12} aria-hidden /> Exit
        </Link>
      </span>
    );
  }
  return (
    <Link href="/welcome?demo=1" className="btn-primary h-10 px-4 text-sm shadow-glow">
      <MonitorPlay size={16} aria-hidden /> Enter demo mode
    </Link>
  );
}
