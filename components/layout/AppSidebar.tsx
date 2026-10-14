"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  Cpu,
  LayoutDashboard,
  LifeBuoy,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useInquiryBasket } from "@/lib/parts/inquiry-basket";
import { useBooleanPreference } from "@/lib/ui-preferences";
import { markWelcomed } from "@/lib/welcome";
import { BrandMark } from "./BrandMark";

interface Destination {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Paths that belong to this destination (drives the active state). */
  match: (path: string) => boolean;
}

/** The five primary destinations. Customers, plants and assets live inside them. */
export const DESTINATIONS: Destination[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, match: (p) => p === "/overview" },
  {
    href: "/installed-base",
    label: "Installed Base",
    icon: Network,
    match: (p) =>
      p.startsWith("/installed-base") || p.startsWith("/customers") || (p.startsWith("/plants") && !p.includes("/outage-scope")),
  },
  {
    href: "/equipment",
    label: "Equipment Intelligence",
    icon: Cpu,
    match: (p) => p.startsWith("/equipment") || p.startsWith("/assets"),
  },
  { href: "/parts-support", label: "Parts & Support", icon: LifeBuoy, match: (p) => p.startsWith("/parts-support") },
  {
    href: "/outage-planning",
    label: "Outage Planning",
    icon: CalendarClock,
    match: (p) => p.startsWith("/outage-planning") || p.includes("/outage-scope"),
  },
];

function NavItem({
  destination: { href, label, icon: Icon },
  active,
  collapsed,
  badge,
}: {
  destination: Destination;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
        active
          ? "bg-gradient-to-r from-accent/20 to-accent/5 font-semibold text-ink shadow-[inset_0_0_0_1px_rgb(56_139_255/0.28)]"
          : "font-medium text-ink-3 hover:bg-white/[0.04] hover:text-ink"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-accent transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
      />
      <span className="relative shrink-0">
        <Icon
          size={19}
          strokeWidth={active ? 2.1 : 1.8}
          className={active ? "text-accent" : "text-ink-3 transition-colors group-hover:text-ink-2"}
          aria-hidden
        />
        {badge ? (
          <span className={`absolute -right-1.5 -top-1.5 size-2 rounded-full bg-cyan ${collapsed ? "" : "lg:hidden"}`} aria-hidden />
        ) : null}
      </span>
      <span className={`flex-1 truncate ${collapsed ? "sr-only" : "sr-only lg:not-sr-only"}`}>{label}</span>
      {badge && !collapsed ? (
        <span
          className="hidden min-w-6 rounded-full bg-accent-strong px-1.5 text-center font-mono text-2xs font-semibold leading-5 text-white lg:inline"
          aria-label={`${badge} line${badge === 1 ? "" : "s"} in inquiry basket`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { basket, hydrated } = useInquiryBasket();
  const [collapsed, setCollapsed] = useBooleanPreference("ibis-sidebar-collapsed", false);

  // Arriving directly on any workspace page (e.g. a shared asset link) counts as
  // having entered, so opening "/" later does not bounce to the welcome screen.
  useEffect(() => {
    if (pathname !== "/welcome") markWelcomed();
  }, [pathname]);

  // The welcome / demo entry page is a full-bleed experience.
  if (pathname === "/welcome") return null;

  return (
    <aside
      className={`sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-ink transition-[width] duration-200 print:hidden ${
        collapsed ? "w-[72px]" : "w-[72px] lg:w-64"
      }`}
    >
      <Link
        href="/overview"
        className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-[18px] transition-colors hover:bg-white/[0.03]"
        title="IBIS · Overview"
      >
        <BrandMark size={36} className="shrink-0" />
        <span className={`min-w-0 leading-tight ${collapsed ? "sr-only" : "sr-only lg:not-sr-only"}`}>
          <span className="block text-2xs font-bold tracking-[0.3em] text-ink-2">ANDRITZ</span>
          <span className="block truncate text-sm font-semibold tracking-tight text-ink">
            IBIS <span className="font-normal text-ink-3">Intelligence</span>
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Primary">
        {DESTINATIONS.map((d) => (
          <NavItem
            key={d.href}
            destination={d}
            active={d.match(pathname)}
            collapsed={collapsed}
            badge={d.href === "/parts-support" && hydrated ? basket.lines.length : undefined}
          />
        ))}
      </nav>

      <div className="space-y-2 border-t border-white/[0.06] p-3">
        {!collapsed && (
          <div className="hidden rounded-lg border border-line bg-white/[0.03] px-3 py-2.5 text-2xs leading-relaxed text-ink-2 lg:block">
            <div className="mb-0.5 flex items-center gap-1.5 font-semibold uppercase tracking-[0.1em] text-cyan">
              <Sparkles size={12} aria-hidden /> Prototype
            </div>
            Demo dataset only. No live customer data.
          </div>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-ink-3 transition-colors hover:bg-white/[0.04] hover:text-ink lg:flex"
        >
          {collapsed ? <PanelLeftOpen size={19} aria-hidden /> : <PanelLeftClose size={19} aria-hidden />}
          {!collapsed && "Collapse sidebar"}
        </button>
      </div>
    </aside>
  );
}
