import Link from "next/link";
import { FileWarning, Headset, ShoppingBasket } from "lucide-react";
import { partsSupportHref } from "@/lib/parts/part-context";
import type { EquipmentContext } from "@/types/parts-commerce";

/** Shown when the local PI manifest is not present (e.g. on another machine). */
export function CatalogUnavailable({ context }: { context: EquipmentContext | null }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-panel px-6 py-10 text-center">
      <FileWarning size={24} className="mx-auto text-ink-3" aria-hidden />
      <p className="mt-2 text-sm font-semibold text-ink">Parts catalog data is not available in this environment</p>
      <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-ink-3">
        The catalog is built from local engineering reference data that is not distributed with the application. Existing
        Inquiry Basket lines remain available, and ANDRITZ can still help you identify parts.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          href={partsSupportHref("/contact", context, { topic: "parts" })}
          className="btn-primary px-3 py-1.5 text-sm"
        >
          <Headset size={14} aria-hidden /> Contact Us for parts assistance
        </Link>
        <Link
          href={partsSupportHref("/basket", context)}
          className="btn-secondary px-3 py-1.5 text-sm"
        >
          <ShoppingBasket size={14} aria-hidden /> View Inquiry Basket
        </Link>
      </div>
    </div>
  );
}
