"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Headset, Info, Layers, Link2, Loader2, ShieldQuestion } from "lucide-react";
import { CATEGORY_LABEL, findPart, sourceLabel, variantSiblings } from "@/lib/parts/catalog";
import { findLine, setLineQuantity, useInquiryBasket } from "@/lib/parts/inquiry-basket";
import { componentName, partsSupportHref } from "@/lib/parts/part-context";
import type { CatalogPart, EquipmentContext, PartsCatalog } from "@/types/parts-commerce";
import { CatalogUnavailable } from "./CatalogUnavailable";
import { AddToInquiryButton, PartNumber, QuantityStepper, ReferenceBadge } from "./PartBits";
import { PartsSupportShell } from "./PartsSupportShell";
import { useComponentNames } from "./PartsSupportContext";
import { usePartsCatalog } from "./usePartsCatalog";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

function RequestPanel({ part, context }: { part: CatalogPart; context: EquipmentContext | null }) {
  const { basket, hydrated } = useInquiryBasket();
  const [quantity, setQuantity] = useState(1);
  const line = hydrated ? findLine(basket, part.id, context?.assetId ?? null) : null;

  return (
    <section className="rounded-md border border-line bg-panel shadow-panel">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Request a Quote</h2>
        <p className="mt-0.5 text-xs text-ink-3">Add this part to your Inquiry Basket for review by ANDRITZ.</p>
      </header>
      <div className="space-y-4 px-4 py-4">
        <div>
          <div className="mb-1.5 text-2xs font-medium uppercase tracking-[0.06em] text-ink-3">
            {line ? "Requested quantity (in basket)" : "Requested quantity"}
          </div>
          {line ? (
            <QuantityStepper
              value={line.quantity}
              onChange={(q) => setLineQuantity(line.key, q)}
              label={`Requested quantity for ${part.description}`}
            />
          ) : (
            <QuantityStepper value={quantity} onChange={setQuantity} label={`Requested quantity for ${part.description}`} />
          )}
        </div>
        <AddToInquiryButton part={part} quantity={quantity} context={context} source="catalog" />
        <div className="rounded bg-raised px-3 py-2 text-xs text-ink-2">
          <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">Requested for</div>
          {context ? (
            <p className="mt-0.5">
              <span className="font-semibold text-ink">{context.assetName}</span>{" "}
              <span className="font-mono">
                ({context.model} · s/n {context.serialNumber})
              </span>
            </p>
          ) : (
            <p className="mt-0.5">No specific unit. You can add the model and serial number in the inquiry form.</p>
          )}
        </div>
        <p className="flex gap-1.5 text-2xs leading-snug text-ink-3">
          <Info size={12} className="mt-px shrink-0" aria-hidden />
          No prices, stock or delivery dates are shown. They are confirmed by an ANDRITZ representative in response to your inquiry.
        </p>
      </div>
      <footer className="border-t border-line px-4 py-3">
        <Link
          href={partsSupportHref("/contact", context, { topic: "parts" })}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
        >
          <Headset size={13} aria-hidden /> Need help confirming this part? Contact Us
        </Link>
      </footer>
    </section>
  );
}

function DetailBody({ catalog, part, context }: { catalog: PartsCatalog; part: CatalogPart; context: EquipmentContext | null }) {
  const names = useComponentNames();
  const siblings = variantSiblings(catalog, part);
  const reasons = part.confirmationReasons;
  // Drawing context opens the existing Interactive PI on the asset, never a copy of the drawing.
  const piEntityKey = part.componentKeys[0] ?? "gearbox";
  const piHref = context ? `/assets/${context.assetId}?entity=${encodeURIComponent(`${context.assetId}-${piEntityKey}`)}&tab=pi` : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-md border border-line bg-panel p-5 shadow-panel">
          <div className="flex flex-wrap items-center gap-2">
            <ReferenceBadge required={reasons.length > 0} formLabel={catalog.formLabel} />
            <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-2xs text-ink-2">{CATEGORY_LABEL[part.category]}</span>
          </div>
          <h2 className="mt-3 text-xl font-semibold leading-snug tracking-tight text-ink">{part.description}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Field label="Part number">
              <PartNumber value={part.partNumber} status={part.partNumberStatus} className="text-base" />
            </Field>
            <Field label="PI reference">
              <span className="font-mono">{part.references.map(sourceLabel).join(", ")}</span>
            </Field>
            <Field label="Equipment family">{part.equipmentFamily}</Field>
            <Field label="Assembly">{part.assembly}</Field>
            <Field label="Listed quantity on PI">
              <span className="font-mono tabular">{part.references[0].listedQuantity ?? "Not listed"}</span>
            </Field>
            <Field label="Shown on">{part.references.flatMap((r) => r.sheets).join(", ")}</Field>
          </dl>
          <p className="mt-4 text-2xs leading-snug text-ink-3">
            The PI item number is the position on the parts illustration and is not an orderable part number. The listed
            quantity is reproduced from the PI parts list and is not a recommended order quantity.
          </p>
        </section>

        {reasons.length > 0 && (
          <section className="rounded-md border border-dashed border-ink-3/60 bg-panel p-4">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <ShieldQuestion size={15} aria-hidden /> Reference confirmation required
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-snug text-ink-2">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-3">
              You can still include this part in an inquiry. ANDRITZ will confirm identification and configuration before quoting.
            </p>
          </section>
        )}

        {siblings.length > 0 && (
          <section className="rounded-md border border-line bg-panel shadow-panel">
            <header className="flex items-center gap-1.5 border-b border-line px-4 py-3">
              <Layers size={15} className="text-ink-2" aria-hidden />
              <h2 className="text-sm font-semibold text-ink">Alternatives documented for item {part.variantGroup}</h2>
            </header>
            <ul className="divide-y divide-line">
              {[part, ...siblings]
                .sort((a, b) => a.references[0].item.localeCompare(b.references[0].item, undefined, { numeric: true }))
                .map((v) => (
                  <li key={v.id} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm ${v.id === part.id ? "bg-info-soft/50" : ""}`}>
                    <span className="min-w-0">
                      <span className="mr-2 font-mono text-xs text-ink-3">Item {v.references[0].item}</span>
                      {v.id === part.id ? (
                        <span className="font-medium text-ink">{v.description}</span>
                      ) : (
                        <Link href={partsSupportHref(`/parts/${v.id}`, context)} className="font-medium text-accent hover:underline">
                          {v.description}
                        </Link>
                      )}
                    </span>
                    <PartNumber value={v.partNumber} status={v.partNumberStatus} className="text-xs" />
                  </li>
                ))}
            </ul>
            <p className="border-t border-line px-4 py-2.5 text-2xs text-ink-3">
              Variants are listed separately and never merged. Choose the one that matches your unit, or ask ANDRITZ to confirm.
            </p>
          </section>
        )}

        <section className="rounded-md border border-line bg-panel p-4 shadow-panel">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <BookOpen size={15} className="text-info" aria-hidden /> Documentation context
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-3">Related IBIS component</div>
              {part.componentKeys.length === 0 ? (
                <p className="mt-1 text-xs text-ink-2">No confirmed mapping to a monitored IBIS component.</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {part.componentKeys.map((k) => (
                    <li key={k} className="flex items-center gap-1.5 text-xs text-ink">
                      <Link2 size={13} className="text-info" aria-hidden />
                      {context ? (
                        <Link
                          href={`/assets/${context.assetId}?entity=${encodeURIComponent(`${context.assetId}-${k}`)}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {componentName(names, k)} on {context.assetName}
                        </Link>
                      ) : (
                        <span className="font-medium">{componentName(names, k)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="text-2xs font-medium uppercase tracking-[0.06em] text-ink-3">Engineering drawing</div>
              <p className="mt-1 text-xs text-ink-2">
                {catalog.formLabel} {catalog.assembly}, item {part.references[0].item} on {part.references[0].sheets.join(", ")}.
              </p>
              {piHref ? (
                <Link href={piHref} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                  Open in Interactive PI on {context!.assetName}
                </Link>
              ) : (
                <p className="mt-1 text-xs text-ink-3">Open an IK-700 asset to view the Interactive PI drawing.</p>
              )}
            </div>
          </div>
          {part.references.some((r) => r.notes) && (
            <div className="mt-4 rounded bg-raised px-3 py-2">
              <div className="text-2xs font-semibold uppercase tracking-[0.06em] text-ink-3">Notes from PI</div>
              {part.references
                .filter((r) => r.notes)
                .map((r) => (
                  <p key={r.item} className="mt-0.5 text-xs leading-snug text-ink-2">
                    {r.notes}
                  </p>
                ))}
            </div>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-18">
        <RequestPanel part={part} context={context} />
      </aside>
    </div>
  );
}

export function PartDetailView({ partId, context }: { partId: string; context: EquipmentContext | null }) {
  const state = usePartsCatalog();
  const part = state.status === "ready" ? findPart(state.catalog, partId) : null;

  return (
    <PartsSupportShell
      section="parts"
      title="Part Details"
      breadcrumbs={[
        { label: "Browse Parts", href: partsSupportHref("/parts", context) },
        { label: part ? part.description : "Part Details" },
      ]}
      context={context}
      actions={
        <Link
          href={partsSupportHref("/parts", context)}
          className="btn-secondary px-3 py-1.5 text-sm"
        >
          <ArrowLeft size={14} aria-hidden /> Back to catalog
        </Link>
      }
    >
      {state.status === "loading" && (
        <p className="flex items-center gap-2 py-10 text-sm text-ink-3">
          <Loader2 size={15} className="animate-spin" aria-hidden /> Loading part details…
        </p>
      )}
      {state.status === "unavailable" && <CatalogUnavailable context={context} />}
      {state.status === "ready" &&
        (part ? (
          <DetailBody catalog={state.catalog} part={part} context={context} />
        ) : (
          <div className="rounded-md border border-dashed border-line-strong bg-panel px-6 py-10 text-center">
            <p className="text-sm font-semibold text-ink">Part not found in the indexed catalog</p>
            <p className="mt-1 text-xs text-ink-3">
              “{partId}” is not an indexed part. It may not be documented on {state.catalog.formLabel}.
            </p>
            <Link href={partsSupportHref("/parts", context)} className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
              Browse all parts
            </Link>
          </div>
        ))}
    </PartsSupportShell>
  );
}
