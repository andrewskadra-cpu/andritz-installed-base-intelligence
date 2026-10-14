"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Headset, Info, PackageSearch, ShoppingBasket } from "lucide-react";
import { SectionLabel } from "@/components/ui/Panel";
import { entityKey } from "@/lib/3d/ik700-model-map";
import type { AssetModel } from "@/lib/asset-model";
import type { Selection } from "@/lib/asset-selection";
import { partForPIItem, sourceLabel } from "@/lib/parts/catalog";
import { addToInquiry, findLine, useInquiryBasket } from "@/lib/parts/inquiry-basket";
import { contextFromRecords, partsSupportHref } from "@/lib/parts/part-context";
import { piReferenceFor } from "@/lib/pi/pi-component-map";
import { PI_FORMS } from "@/lib/pi/pi-registry";
import type { CatalogPart, EquipmentContext } from "@/types/parts-commerce";
import { PartNumber, ReferenceBadge } from "./PartBits";
import { usePartsCatalog } from "./usePartsCatalog";

const linkCls = "inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline";

function MappedPart({
  part,
  context,
  hasCondition,
}: {
  part: CatalogPart;
  context: EquipmentContext;
  hasCondition: boolean;
}) {
  const router = useRouter();
  const { basket, hydrated } = useInquiryBasket();
  const [feedback, setFeedback] = useState<"added" | "exists" | null>(null);
  const inBasket = hydrated && findLine(basket, part.id, context.assetId) !== null;
  const basketHref = partsSupportHref("/basket", context);
  const add = (view: boolean) => {
    setFeedback(addToInquiry({ part, quantity: 1, context, source: "asset-condition" }));
    if (view) router.push(basketHref);
  };

  return (
    <div className="rounded border border-line">
      <div className="px-3 py-2.5">
        <div className="text-sm font-semibold leading-snug text-ink">{part.description}</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-3">
          <span>
            Part no. <PartNumber value={part.partNumber} status={part.partNumberStatus} />
          </span>
          <span className="font-mono">{part.references.map(sourceLabel).join(", ")}</span>
        </div>
        <div className="mt-1.5">
          <ReferenceBadge required={part.confirmationReasons.length > 0} />
        </div>
      </div>
      <p className="border-t border-line bg-sunken/70 px-3 py-2 text-xs leading-snug text-ink-2">
        {hasCondition
          ? "Consider requesting a quote for review. Adding to an inquiry asks ANDRITZ to confirm availability and compatibility; it does not order a part or mean replacement is required."
          : "Add to inquiry for availability and compatibility confirmation. This does not order a part."}
      </p>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
        {inBasket ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded border border-healthy/30 bg-healthy-soft px-2.5 py-1 text-xs font-medium text-healthy">
              <Check size={13} aria-hidden /> In Inquiry Basket
            </span>
            <Link href={basketHref} className={linkCls}>
              View inquiry basket <ArrowRight size={12} aria-hidden />
            </Link>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => add(false)}
              disabled={!hydrated}
              className="btn-primary px-2.5 py-1 text-xs disabled:opacity-60"
            >
              <ShoppingBasket size={13} aria-hidden /> Add to Parts Inquiry
            </button>
            <button
              type="button"
              onClick={() => add(true)}
              disabled={!hydrated}
              className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-60"
            >
              Add and view basket
            </button>
          </>
        )}
        <span role="status" aria-live="polite" className="text-2xs text-ink-3">
          {feedback === "added" && inBasket && "Added. Continue reviewing, or open the basket when ready."}
          {feedback === "exists" && "Already in the basket."}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-3 py-2">
        <Link href={partsSupportHref(`/parts/${part.id}`, context)} className={linkCls}>
          Part Details
        </Link>
        <Link href={partsSupportHref("/parts", context)} className={linkCls}>
          Browse related parts
        </Link>
      </div>
    </div>
  );
}

/**
 * Parts inquiry for the selected node. Only an exact PI item mapping offers
 * "Add to Parts Inquiry"; otherwise the user can search, never auto-picked.
 */
export function AssetPartsInquiry({
  model,
  selection,
  hasCondition,
  embedded = false,
}: {
  model: AssetModel;
  selection: Selection;
  hasCondition: boolean;
  /** Rendered inside another section: no own divider or padding. */
  embedded?: boolean;
}) {
  const state = usePartsCatalog();
  const { node } = selection;
  const context = contextFromRecords(model.records, node.type === "asset" ? null : node.id);
  const reference = node.type === "asset" ? null : piReferenceFor(entityKey(model.rootId, node.id));
  const part = reference?.item && state.status === "ready" ? partForPIItem(state.catalog, reference.form, reference.item) : null;

  let body;
  if (reference?.item && state.status === "loading") {
    body = <p className="text-xs text-ink-3">Loading parts reference…</p>;
  } else if (part) {
    body = <MappedPart part={part} context={context} hasCondition={hasCondition} />;
  } else if (reference?.item) {
    // Mapped item, but the catalog data is not present in this environment.
    body = (
      <div className="rounded border border-dashed border-line-strong px-3 py-2.5 text-xs text-ink-2">
        <p>
          Documented as <span className="font-mono">{PI_FORMS[reference.form]?.label} · Item {reference.item}</span>. Parts catalog data
          is not available in this environment.
        </p>
        <Link href={partsSupportHref("/contact", context, { topic: "parts" })} className={`mt-1.5 ${linkCls}`}>
          <Headset size={12} aria-hidden /> Contact Us for parts assistance
        </Link>
      </div>
    );
  } else {
    const search: Record<string, string> = reference || node.type === "asset" ? {} : { q: node.name };
    body = (
      <div className="rounded border border-line px-3 py-2.5 text-xs text-ink-2">
        <p className="flex gap-1.5">
          <Info size={13} className="mt-px shrink-0 text-ink-3" aria-hidden />
          {node.type === "asset"
            ? `Request quotes for documented ${model.records.asset.model} parts or contact ANDRITZ about this unit.`
            : `No single verified part mapping for ${node.name}. Search the catalog and choose parts yourself.`}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <Link href={partsSupportHref("/parts", context, search)} className={linkCls}>
            <PackageSearch size={12} aria-hidden /> {node.type === "asset" ? "Browse parts" : "Find related parts"}
          </Link>
          <Link href={partsSupportHref("/contact", context)} className={linkCls}>
            <Headset size={12} aria-hidden /> Contact Us
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-2" : "space-y-2 border-t border-line px-4 py-4"}>
      <div className="flex items-center justify-between">
        <SectionLabel>Parts inquiry</SectionLabel>
        <Link href={partsSupportHref("", context)} className="text-2xs font-medium text-accent hover:underline">
          Parts &amp; Support
        </Link>
      </div>
      {body}
    </div>
  );
}

/**
 * Compact "Add to inquiry" for a line that carries an engineering reference
 * (asset Parts tab, outage planning). Lines without one get a search link.
 */
export function ReferenceInquiryAction({
  document,
  item,
  context,
  source,
  searchHint,
}: {
  document: string | null;
  item: string | null;
  context: EquipmentContext;
  source: "asset-parts" | "outage-planning";
  searchHint: string;
}) {
  const state = usePartsCatalog();
  const { basket, hydrated } = useInquiryBasket();
  const form = document ? Object.values(PI_FORMS).find((f) => f.label === document)?.form ?? null : null;
  const part = form && item && state.status === "ready" ? partForPIItem(state.catalog, form, item) : null;

  if (!part) {
    if (form && item && state.status === "loading") return null;
    return (
      <Link href={partsSupportHref("/parts", context, { q: searchHint })} className={`whitespace-nowrap ${linkCls}`}>
        <PackageSearch size={12} aria-hidden /> Find related parts
      </Link>
    );
  }
  if (hydrated && findLine(basket, part.id, context.assetId)) {
    return (
      <Link href={partsSupportHref("/basket", context)} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-healthy hover:underline">
        <Check size={12} aria-hidden /> In Inquiry Basket
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => addToInquiry({ part, quantity: 1, context, source })}
      disabled={!hydrated}
      className="whitespace-nowrap btn-secondary px-2 py-0.5 text-xs disabled:opacity-60"
    >
      <ShoppingBasket size={12} aria-hidden /> Add to inquiry
    </button>
  );
}
