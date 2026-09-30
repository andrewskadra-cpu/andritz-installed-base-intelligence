"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Factory, Search, type LucideIcon } from "lucide-react";

export interface SidebarLink {
  href: string;
  label: string;
  kind: "customer" | "plant";
}

const KIND_ICON: Record<SidebarLink["kind"], LucideIcon> = {
  customer: Building2,
  plant: Factory,
};

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  indent = false,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
        indent ? "lg:pl-6" : ""
      } ${
        active
          ? "bg-navy-700 text-white"
          : "text-navy-300 hover:bg-navy-800 hover:text-white"
      }`}
    >
      <Icon size={17} strokeWidth={1.9} className="shrink-0" aria-hidden />
      <span className="hidden truncate lg:inline">{label}</span>
    </Link>
  );
}

export function AppSidebar({ links }: { links: SidebarLink[] }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col border-r border-navy-950 bg-navy-900 text-white lg:w-60">
      <div className="flex h-14 items-center gap-2.5 border-b border-navy-800 px-4">
        <div className="grid size-8 shrink-0 place-items-center rounded bg-white font-mono text-[11px] font-bold tracking-tight text-navy-900">
          IBI
        </div>
        <div className="hidden min-w-0 leading-tight lg:block">
          <div className="text-[13px] font-bold tracking-[0.14em]">ANDRITZ</div>
          <div className="truncate text-[11px] text-navy-300">Installed-Base Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4" aria-label="Primary">
        <div className="space-y-1">
          <NavItem href="/" label="Installed-base search" icon={Search} active={pathname === "/"} />
        </div>

        <div className="space-y-1">
          <div className="hidden px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy-300/70 lg:block">
            Demo installed base
          </div>
          {links.map((link) => (
            <NavItem
              key={link.href}
              href={link.href}
              label={link.label}
              icon={KIND_ICON[link.kind]}
              indent={link.kind === "plant"}
              active={pathname === link.href}
            />
          ))}
        </div>
      </nav>

      <div className="hidden border-t border-navy-800 px-4 py-3 text-[11px] leading-relaxed text-navy-300 lg:block">
        Prototype · demo dataset only.
        <br />
        No live customer data.
      </div>
    </aside>
  );
}
