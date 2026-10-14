"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Headset, LayoutGrid, MapPin, PackageSearch, ShoppingBasket, type LucideIcon } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import type { BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { usePathname } from "next/navigation";
import { basketEquipment, useInquiryBasket } from "@/lib/parts/inquiry-basket";
import { assetHref, partsSupportHref } from "@/lib/parts/part-context";
import type { EquipmentContext } from "@/types/parts-commerce";

export type PartsSupportSection = "home" | "parts" | "basket" | "contact";

function SubNavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-3 text-sm transition-colors ${
        active
          ? "border-accent font-semibold text-ink"
          : "border-transparent font-medium text-ink-3 hover:border-line-strong hover:text-ink"
      }`}
    >
      <Icon size={16} className={`shrink-0 ${active ? "text-accent" : ""}`} aria-hidden />
      {label}
      {badge}
    </Link>
  );
}

export function BasketCount({ className = "" }: { className?: string }) {
  const { basket, hydrated } = useInquiryBasket();
  const count = hydrated ? basket.lines.length : 0;
  return (
    <span
      aria-label={`${count} line${count === 1 ? "" : "s"} in inquiry basket`}
      className={`inline-grid min-w-5 place-items-center rounded-full px-1.5 font-mono text-2xs font-semibold tabular leading-5 ${
        count > 0 ? "bg-accent-strong text-white" : "bg-raised text-ink-3 ring-1 ring-inset ring-line-strong"
      } ${className}`}
    >
      {count}
    </span>
  );
}

/**
 * No equipment in the URL, but the basket is for exactly one unit: offer to
 * continue with it (explicit choice; nothing is applied automatically).
 */
function ContinueWithEquipment() {
  const pathname = usePathname();
  const { basket, hydrated } = useInquiryBasket();
  const equipment = hydrated ? basketEquipment(basket) : null;
  if (!equipment) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-sunken/70 px-4 py-2.5 text-xs text-ink-2">
      <span className="flex items-center gap-1.5">
        <MapPin size={13} className="shrink-0 text-ink-3" aria-hidden />
        Your Inquiry Basket has parts for <span className="font-semibold text-ink">{equipment.assetName}</span>. Parts added here are
        not linked to a unit.
      </span>
      <Link href={`${pathname}?asset=${encodeURIComponent(equipment.assetId)}`} className="font-medium text-accent hover:underline">
        Continue with {equipment.assetName}
      </Link>
    </div>
  );
}

/** Equipment context carried from an asset, with a way back. */
export function ContextBanner({ context }: { context: EquipmentContext }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-info/30 bg-info-soft/70 px-4 py-2.5 text-xs">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-ink-2">
        <MapPin size={14} className="shrink-0 text-info" aria-hidden />
        <span className="text-sm font-semibold text-ink">{context.assetName}</span>
        <span className="font-mono">
          {context.model} · s/n {context.serialNumber}
        </span>
        <span className="text-ink-3">
          {context.plantName} · {context.unitName}
        </span>
        {context.entityName && (
          <span>
            Component: <span className="font-medium text-ink">{context.entityName}</span>
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link href={assetHref(context)} className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
          <ArrowLeft size={12} aria-hidden /> Back to asset
        </Link>
      </div>
    </div>
  );
}

/**
 * Common frame for every Parts & Support page: breadcrumbs, title band,
 * and the secondary navigation that separates Parts Inquiry from Contact Us.
 */
export function PartsSupportShell({
  section,
  title,
  description,
  breadcrumbs = [],
  context,
  actions,
  children,
}: {
  section: PartsSupportSection;
  title: string;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  context: EquipmentContext | null;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const crumbs: BreadcrumbItem[] = [
    section === "home" && breadcrumbs.length === 0
      ? { label: "Parts & Support" }
      : { label: "Parts & Support", href: partsSupportHref("", context) },
    ...breadcrumbs,
  ];

  return (
    <>
      <TopBar breadcrumbs={crumbs} />
      <div className="page-band">
        <div className="mx-auto w-full max-w-7xl px-4 pt-7 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="eyebrow flex items-center gap-1.5 text-cyan">
                <LayoutGrid size={12} aria-hidden /> Parts &amp; Support · IK-700 aftermarket
              </div>
              <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-ink">{title}</h1>
              {description && <p className="mt-2 max-w-3xl text-base text-ink-2">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
          <div className="mt-4 empty:hidden">{context ? <ContextBanner context={context} /> : <ContinueWithEquipment />}</div>
          <nav aria-label="Parts & Support" className="mt-5 flex items-end gap-1 overflow-x-auto">
            <span className="eyebrow hidden self-center pr-1 sm:block">
              Parts Inquiry
            </span>
            <SubNavLink
              href={partsSupportHref("/parts", context)}
              label="Browse Parts"
              icon={PackageSearch}
              active={section === "parts"}
            />
            <SubNavLink
              href={partsSupportHref("/basket", context)}
              label="Inquiry Basket"
              icon={ShoppingBasket}
              active={section === "basket"}
              badge={<BasketCount className="ml-0.5" />}
            />
            <span className="mx-2 mb-2.5 h-5 w-px self-end bg-line-strong" aria-hidden />
            <SubNavLink
              href={partsSupportHref("/contact", context)}
              label="Contact Us"
              icon={Headset}
              active={section === "contact"}
            />
          </nav>
        </div>
      </div>
      <main className="mx-auto w-full max-w-7xl animate-enter px-4 py-7 lg:px-8">{children}</main>
    </>
  );
}
