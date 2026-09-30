import { CircleAlert, CircleCheck, CircleHelp, OctagonAlert, type LucideIcon } from "lucide-react";
import type { HealthStatus } from "@/types/installed-base";

export interface StatusMeta {
  label: string;
  icon: LucideIcon;
  /** Solid text colour. */
  text: string;
  /** Soft background + border for badges and rows. */
  soft: string;
  /** Solid fill for dots and bars. */
  fill: string;
  /** Left accent border for cards. */
  accent: string;
  /** Hex value for canvas/SVG rendering. */
  hex: string;
}

export const STATUS_META: Record<HealthStatus, StatusMeta> = {
  critical: {
    label: "Critical",
    icon: OctagonAlert,
    text: "text-critical",
    soft: "bg-critical-soft border-critical/30 text-critical",
    fill: "bg-critical",
    accent: "border-l-critical",
    hex: "#c0262d",
  },
  attention: {
    label: "Attention",
    icon: CircleAlert,
    text: "text-attention",
    soft: "bg-attention-soft border-attention/30 text-attention",
    fill: "bg-attention",
    accent: "border-l-attention",
    hex: "#d48a1a",
  },
  healthy: {
    label: "Healthy",
    icon: CircleCheck,
    text: "text-healthy",
    soft: "bg-healthy-soft border-healthy/30 text-healthy",
    fill: "bg-healthy",
    accent: "border-l-healthy",
    hex: "#2f8f5b",
  },
  unknown: {
    label: "Unknown",
    icon: CircleHelp,
    text: "text-unknown",
    soft: "bg-unknown-soft border-unknown/30 text-unknown",
    fill: "bg-unknown",
    accent: "border-l-unknown",
    hex: "#8a95a8",
  },
};

export const STATUS_ORDER: HealthStatus[] = ["critical", "attention", "healthy", "unknown"];

/** Muted green used for healthy regions in the 3D view so faults stand out. */
const VIEWER_HEALTHY_TINT = "#9dbfaa";

export function viewerColor(status: HealthStatus) {
  return status === "healthy" ? VIEWER_HEALTHY_TINT : STATUS_META[status].hex;
}
