"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { captureTelemetry } from "@/lib/telemetry/telemetry-registry";

/** Captures the current live telemetry, then opens the outage-scope view. */
export function BuildOutageScopeButton({
  href,
  label = "Build Outage Scope",
  variant = "primary",
}: {
  href: string;
  label?: string;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      onClick={() => captureTelemetry()}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium print:hidden ${
        variant === "primary"
          ? "bg-navy-900 text-white hover:bg-navy-800"
          : "border border-line-strong bg-panel text-ink-2 hover:text-ink"
      }`}
    >
      <ClipboardList size={15} aria-hidden />
      {label}
    </Link>
  );
}
