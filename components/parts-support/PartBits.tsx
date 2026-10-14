"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ClipboardCopy, FileCheck2, Minus, Plus, ShieldQuestion, ShoppingBasket } from "lucide-react";
import {
  addToInquiry,
  findLine,
  isValidQuantity,
  MAX_QUANTITY,
  MIN_QUANTITY,
  useInquiryBasket,
} from "@/lib/parts/inquiry-basket";
import { partsSupportHref } from "@/lib/parts/part-context";
import type { CatalogPart, EquipmentContext, InquiryLine, PartNumberStatus } from "@/types/parts-commerce";

/** Documented part number, or an explicit "not listed". Never a PI item number. */
export function PartNumber({
  value,
  status,
  className = "",
}: {
  value: string | null;
  status: PartNumberStatus;
  className?: string;
}) {
  if (value === null) return <span className={`text-ink-3 italic ${className}`}>Not listed</span>;
  return (
    <span
      className={`font-mono tabular text-ink ${className}`}
      title={status === "bracketed" ? "Printed in brackets on the PI parts list" : "Part number as listed on the PI parts list"}
    >
      {status === "bracketed" ? `(${value})` : value}
    </span>
  );
}

/** "Reference confirmation required" vs "Documented in PI". Not a stock or fit claim. */
export function ReferenceBadge({ required, formLabel = "PI 4066" }: { required: boolean; formLabel?: string }) {
  return required ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-dashed border-ink-3 bg-panel px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em] text-ink-2">
      <ShieldQuestion size={11} strokeWidth={2.25} aria-hidden />
      Reference confirmation required
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded border border-info/30 bg-info-soft px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em] text-info">
      <FileCheck2 size={11} strokeWidth={2.25} aria-hidden />
      Documented in {formLabel}
    </span>
  );
}

export function QuantityStepper({
  value,
  onChange,
  label,
  size = "md",
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  size?: "sm" | "md";
}) {
  // Free text while typing; committed (clamped) on blur. Invalid input is shown, not silently fixed.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? String(value);
  const parsed = Number(shown);
  const invalid = draft !== null && !isValidQuantity(parsed);
  const h = size === "sm" ? "h-7" : "h-8";
  const commit = () => {
    if (draft === null) return;
    if (isValidQuantity(parsed)) onChange(parsed);
    setDraft(null);
  };
  return (
    <div>
      <div
        className={`inline-flex ${h} items-stretch overflow-hidden rounded border bg-panel ${invalid ? "border-critical" : "border-line-strong"}`}
      >
        <button
          type="button"
          onClick={() => onChange(Math.max(MIN_QUANTITY, value - 1))}
          disabled={value <= MIN_QUANTITY}
          aria-label={`Decrease ${label}`}
          className="grid w-7 place-items-center text-ink-2 hover:bg-raised/70 disabled:opacity-40"
        >
          <Minus size={13} aria-hidden />
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          aria-invalid={invalid || undefined}
          value={shown}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-10 border-x border-line text-center font-mono text-sm tabular text-ink outline-none focus:bg-info-soft/40"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(MAX_QUANTITY, value + 1))}
          disabled={value >= MAX_QUANTITY}
          aria-label={`Increase ${label}`}
          className="grid w-7 place-items-center text-ink-2 hover:bg-raised/70 disabled:opacity-40"
        >
          <Plus size={13} aria-hidden />
        </button>
      </div>
      {invalid && (
        <p role="alert" className="mt-1 text-2xs text-critical">
          Enter a whole number from {MIN_QUANTITY} to {MAX_QUANTITY}.
        </p>
      )}
    </div>
  );
}

/**
 * Add a part to the Inquiry Basket. Idempotent per part + equipment: a
 * second click reports "already in basket" instead of adding a duplicate.
 */
export function AddToInquiryButton({
  part,
  quantity = 1,
  context,
  source,
  label = "Add to Inquiry",
  size = "md",
  showViewLink = true,
}: {
  part: CatalogPart;
  quantity?: number;
  context: EquipmentContext | null;
  source: InquiryLine["source"];
  label?: string;
  size?: "sm" | "md";
  showViewLink?: boolean;
}) {
  const { basket, hydrated } = useInquiryBasket();
  const [feedback, setFeedback] = useState<"added" | "exists" | null>(null);
  const inBasket = hydrated && findLine(basket, part.id, context?.assetId ?? null) !== null;
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {inBasket ? (
        <span className={`inline-flex items-center gap-1.5 rounded border border-healthy/30 bg-healthy-soft font-medium text-healthy ${pad}`}>
          <Check size={14} aria-hidden /> In Inquiry Basket
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setFeedback(addToInquiry({ part, quantity, context, source }))}
          disabled={!hydrated}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap btn-primary disabled:opacity-60 ${pad}`}
        >
          <ShoppingBasket size={14} aria-hidden /> {label}
        </button>
      )}
      {showViewLink && inBasket && (
        <Link href={partsSupportHref("/basket", context)} className="text-xs font-medium text-accent hover:underline">
          View inquiry basket
        </Link>
      )}
      <span role="status" aria-live="polite" className="text-xs text-ink-3">
        {feedback === "added" && inBasket && "Added for quotation review."}
        {feedback === "exists" && "Already in the basket; quantity unchanged."}
      </span>
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="btn-secondary px-3 py-1.5 text-sm"
    >
      {state === "copied" ? <Check size={14} className="text-healthy" aria-hidden /> : <ClipboardCopy size={14} aria-hidden />}
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed: select the text" : label}
    </button>
  );
}
