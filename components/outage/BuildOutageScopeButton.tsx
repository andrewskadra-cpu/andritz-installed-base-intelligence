"use client";

import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { captureTelemetry } from "@/lib/telemetry/telemetry-registry";

/** Outage-scope link that lands on one asset of a unit. */
export function outageScopeHref(plantId: string, unitId: string, assetId: string) {
  return `/plants/${plantId}/outage-scope?unit=${unitId}#scope-asset-${assetId}`;
}

/** Captures the current live telemetry, then opens the outage-scope view. */
export function BuildOutageScopeButton({
  href,
  label = "Build Draft Outage Scope",
  variant = "primary",
  className = "",
}: {
  href: string;
  label?: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={() => captureTelemetry()}
      className={`whitespace-nowrap px-3.5 py-2 text-sm print:hidden ${className} ${variant === "primary" ? "btn-primary" : "btn-secondary"}`}
    >
      <ClipboardList size={15} aria-hidden />
      {label}
    </Link>
  );
}
