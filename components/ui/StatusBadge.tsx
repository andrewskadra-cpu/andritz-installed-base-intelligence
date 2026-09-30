import type { HealthStatus } from "@/types/installed-base";
import { STATUS_META } from "./status";

export function StatusBadge({
  status,
  size = "md",
}: {
  status: HealthStatus;
  size?: "sm" | "md" | "lg";
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const sizing = {
    sm: "gap-1 px-1.5 py-0.5 text-[11px]",
    md: "gap-1.5 px-2 py-0.5 text-xs",
    lg: "gap-2 px-3 py-1 text-sm",
  }[size];
  const iconSize = size === "lg" ? 16 : size === "md" ? 14 : 12;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border font-semibold uppercase tracking-wide ${meta.soft} ${sizing}`}
    >
      <Icon size={iconSize} strokeWidth={2.25} aria-hidden />
      {meta.label}
    </span>
  );
}

export function StatusDot({ status, className = "" }: { status: HealthStatus; className?: string }) {
  return (
    <span
      className={`inline-block size-2.5 shrink-0 rounded-full ${STATUS_META[status].fill} ${className}`}
      aria-label={STATUS_META[status].label}
      role="img"
    />
  );
}
