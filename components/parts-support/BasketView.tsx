"use client";

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FlaskConical,
  Headset,
  Info,
  Loader2,
  MessageSquarePlus,
  PackageSearch,
  Send,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import {
  basketEquipment,
  clearInquiry,
  isValidQuantity,
  removeLine,
  setInquiryNote,
  setLineNote,
  setLineQuantity,
  totalQuantity,
  useInquiryBasket,
} from "@/lib/parts/inquiry-basket";
import {
  demoReference,
  formatInquirySummary,
  NOT_AN_ORDER_NOTICE,
  NOTHING_SENT_NOTICE,
  validateEmail,
  type ContactDetails,
} from "@/lib/parts/inquiry-summary";
import { assetHref, partsSupportHref } from "@/lib/parts/part-context";
import type { EquipmentContext, InquiryBasket, InquiryLine } from "@/types/parts-commerce";
import { CopyButton, PartNumber, QuantityStepper, ReferenceBadge } from "./PartBits";
import { PartsSupportShell } from "./PartsSupportShell";

const SOURCE_LABEL: Record<InquiryLine["source"], string> = {
  catalog: "Added from catalog",
  "asset-condition": "Added from condition assessment",
  "asset-parts": "Added from asset Parts tab",
  "outage-planning": "Added from outage planning",
  "pi-viewer": "Added from Interactive PI",
};

export function TextField({
  id,
  label,
  value,
  onChange,
  required = false,
  error,
  type = "text",
  autoComplete,
  multiline = false,
  hint,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string | null;
  type?: string;
  autoComplete?: string;
  multiline?: boolean;
  hint?: ReactNode;
  placeholder?: string;
}) {
  const cls = `w-full rounded-lg border bg-raised px-3 text-sm text-ink transition-shadow placeholder:text-ink-3 focus:outline-none ${
    error ? "border-critical focus:ring-2 focus:ring-critical/30" : "border-line-strong focus:border-accent focus:shadow-glow"
  }`;
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-baseline justify-between text-xs font-medium text-ink-2">
        <span>
          {label}
          {required && <span className="text-critical"> *</span>}
        </span>
        {!required && <span className="text-2xs font-normal text-ink-3">Optional</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          placeholder={placeholder}
          className={`${cls} py-2`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          placeholder={placeholder}
          className={`${cls} h-9`}
        />
      )}
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-2xs text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-2xs text-critical">
          {error}
        </p>
      )}
    </div>
  );
}

export function DemoSubmissionBanner() {
  return (
    <div className="flex gap-2 rounded border border-info/30 bg-info-soft px-3 py-2.5 text-xs text-info">
      <FlaskConical size={16} className="mt-0.5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">Simulated submission</p>
        <p className="mt-0.5 text-ink-2">{NOTHING_SENT_NOTICE} Copy the summary below if you want to send it yourself.</p>
      </div>
    </div>
  );
}

function BasketLineRow({ line, context }: { line: InquiryLine; context: EquipmentContext | null }) {
  const [noteOpen, setNoteOpen] = useState(line.note.length > 0);
  return (
    <li className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={partsSupportHref(`/parts/${line.partId}`, context)}
            className="text-sm font-semibold leading-snug text-ink hover:text-accent hover:underline"
          >
            {line.description}
          </Link>
          <dl className="mt-1.5 grid gap-x-5 gap-y-1 text-xs sm:grid-cols-2">
            <div className="flex gap-1.5">
              <dt className="text-ink-3">Part no.</dt>
              <dd>
                <PartNumber value={line.partNumber} status={line.partNumberStatus} className="font-medium" />
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-ink-3">Document ref.</dt>
              <dd className="font-mono text-ink-2">{line.piReferences.join(", ")}</dd>
            </div>
            <div className="flex gap-1.5 sm:col-span-2">
              <dt className="text-ink-3">Equipment</dt>
              <dd className="text-ink-2">
                {line.equipment ? (
                  <>
                    <span className="font-medium text-ink">{line.equipment.assetName}</span>{" "}
                    <span className="font-mono">
                      ({line.equipment.model} · s/n {line.equipment.serialNumber})
                    </span>{" "}
                    · {line.equipment.plantName}
                  </>
                ) : (
                  "Not specified"
                )}
              </dd>
            </div>
            {line.components.length > 0 && (
              <div className="flex gap-1.5 sm:col-span-2">
                <dt className="text-ink-3">Related component</dt>
                <dd className="text-ink-2">{line.components.join(", ")}</dd>
              </div>
            )}
          </dl>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ReferenceBadge required={line.confirmationRequired} />
            <span className="text-2xs text-ink-3">{SOURCE_LABEL[line.source]}</span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <QuantityStepper value={line.quantity} onChange={(q) => setLineQuantity(line.key, q)} label={`Requested quantity for ${line.description}`} />
          <button
            type="button"
            onClick={() => removeLine(line.key)}
            aria-label={`Remove ${line.description} from inquiry`}
            className="grid size-8 place-items-center rounded border border-line text-ink-3 hover:border-critical/40 hover:text-critical"
          >
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
      </div>
      {noteOpen ? (
        <div className="mt-3">
          <label htmlFor={`note-${line.key}`} className="mb-1 block text-2xs font-medium text-ink-3">
            Line note (configuration, position, reason for request)
          </label>
          <textarea
            id={`note-${line.key}`}
            value={line.note}
            onChange={(e) => setLineNote(line.key, e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-line-strong bg-raised px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:shadow-glow"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
        >
          <MessageSquarePlus size={13} aria-hidden /> Add line note
        </button>
      )}
    </li>
  );
}

type FormState = Record<keyof ContactDetails, string | null>;
const EMPTY_FORM: FormState = { name: null, company: null, email: null, phone: null, site: null, equipmentModel: null, serialNumber: null, notes: null };

function RFQForm({
  basket,
  context,
  onSubmitted,
}: {
  basket: InquiryBasket;
  context: EquipmentContext | null;
  onSubmitted: (reference: string, contact: ContactDetails) => void;
}) {
  // Contact details live in component state only: never written to browser storage.
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactDetails | "lines", string>>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const equipment = context ?? basketEquipment(basket);
  const prefill: ContactDetails = {
    name: "",
    company: "",
    email: "",
    phone: "",
    site: equipment ? `${equipment.plantName} · ${equipment.unitName}` : "",
    equipmentModel: equipment?.model ?? "",
    serialNumber: equipment?.serialNumber ?? "",
    notes: "",
  };
  const value = (k: keyof ContactDetails) => form[k] ?? prefill[k];
  const set = (k: keyof ContactDetails) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const contact = Object.fromEntries((Object.keys(EMPTY_FORM) as (keyof ContactDetails)[]).map((k) => [k, value(k)])) as unknown as ContactDetails;
    const next: typeof errors = {};
    if (!contact.name.trim()) next.name = "Enter a contact name.";
    if (!contact.company.trim()) next.company = "Enter a company.";
    if (!contact.email.trim()) next.email = "Enter an email address.";
    else if (!validateEmail(contact.email)) next.email = "Enter a valid email address, e.g. name@company.com.";
    if (basket.lines.length === 0) next.lines = "Add at least one part to the Inquiry Basket.";
    else if (!basket.lines.every((l) => isValidQuantity(l.quantity))) next.lines = "Every line needs a whole-number quantity of at least 1.";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    onSubmitted(demoReference("RFQ"), contact);
  };

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="rounded-md border border-line bg-panel shadow-panel">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Request a Quote</h2>
        <p className="mt-0.5 text-xs text-ink-3">Your details are used only to build the inquiry summary and are not stored.</p>
      </header>
      <div className="space-y-3 px-4 py-4">
        <TextField id="rfq-name" label="Contact name" value={value("name")} onChange={set("name")} required error={errors.name} autoComplete="name" />
        <TextField id="rfq-company" label="Company" value={value("company")} onChange={set("company")} required error={errors.company} autoComplete="organization" />
        <TextField id="rfq-email" label="Email" type="email" value={value("email")} onChange={set("email")} required error={errors.email} autoComplete="email" />
        <TextField id="rfq-phone" label="Phone" type="tel" value={value("phone")} onChange={set("phone")} autoComplete="tel" />
        <TextField id="rfq-site" label="Plant / site" value={value("site")} onChange={set("site")} />
        <div className="grid grid-cols-2 gap-3">
          <TextField id="rfq-model" label="Equipment model" value={value("equipmentModel")} onChange={set("equipmentModel")} />
          <TextField id="rfq-serial" label="Serial number" value={value("serialNumber")} onChange={set("serialNumber")} />
        </div>
        {equipment && (
          <p className="-mt-1 text-2xs text-ink-3">
            Prefilled from {equipment.assetName} (demo installed base). Edit if the inquiry is for another unit.
          </p>
        )}
        <TextField id="rfq-notes" label="Additional notes" value={value("notes")} onChange={set("notes")} multiline />
        {errors.lines && (
          <p role="alert" className="rounded border border-critical/30 bg-critical-soft px-3 py-2 text-xs text-critical">
            {errors.lines}
          </p>
        )}
        <p className="flex gap-1.5 rounded bg-raised px-3 py-2.5 text-xs leading-snug text-ink-2">
          <Info size={13} className="mt-px shrink-0 text-ink-3" aria-hidden />
          {NOT_AN_ORDER_NOTICE}
        </p>
        <button
          type="submit"
          className="w-full btn-primary px-3 py-2 text-sm"
        >
          <Send size={15} aria-hidden /> Submit Inquiry (demo)
        </button>
        <p className="text-center text-2xs text-ink-3">Demo only: nothing is sent to ANDRITZ.</p>
      </div>
    </form>
  );
}

function Submitted({
  reference,
  summary,
  context,
  backAsset,
  onEdit,
}: {
  reference: string;
  summary: string;
  context: EquipmentContext | null;
  backAsset: { assetId: string; entityId: string | null; assetName: string } | null;
  onEdit: () => void;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <DemoSubmissionBanner />
      <section className="rounded-md border border-line bg-panel p-5 shadow-panel">
        <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-3">Inquiry prepared (not sent)</div>
        <h2 className="mt-1 text-xl font-semibold text-ink">Your inquiry summary is ready to copy</h2>
        <p className="mt-1 text-sm text-ink-2">
          Demo reference <span className="font-mono font-semibold text-ink">{reference}</span>. This reference was generated in your
          browser for the demonstration and is not known to ANDRITZ.
        </p>
        <label htmlFor="rfq-summary" className="mt-4 block text-xs font-medium text-ink-2">
          Inquiry summary
        </label>
        <textarea
          id="rfq-summary"
          readOnly
          value={summary}
          rows={16}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-1 w-full rounded-lg border border-line-strong bg-sunken px-3.5 py-3 font-mono text-xs leading-relaxed text-ink"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <CopyButton text={summary} label="Copy Inquiry" />
          <button
            type="button"
            onClick={onEdit}
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            <ArrowLeft size={14} aria-hidden /> Edit inquiry
          </button>
          {backAsset && (
            <Link
              href={assetHref(backAsset)}
              className="btn-secondary px-3 py-1.5 text-sm"
            >
              Back to {backAsset.assetName}
            </Link>
          )}
        </div>
        <p className="mt-4 text-xs text-ink-3">{NOT_AN_ORDER_NOTICE}</p>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-panel px-4 py-3 text-sm">
        <span className="text-ink-2">Your Inquiry Basket is kept until you clear it.</span>
        {confirmClear ? (
          <span className="flex items-center gap-2">
            <span className="text-xs text-ink-2">Clear all lines?</span>
            <button
              type="button"
              onClick={() => {
                clearInquiry();
                onEdit();
              }}
              className="rounded bg-critical px-2.5 py-1 text-xs font-semibold text-white"
            >
              Clear basket
            </button>
            <button type="button" onClick={() => setConfirmClear(false)} className="text-xs font-medium text-ink-2 hover:underline">
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmClear(true)} className="text-xs font-medium text-accent hover:underline">
            Clear basket and start a new inquiry
          </button>
        )}
      </div>
      <p className="text-center text-xs text-ink-3">
        <Link href={partsSupportHref("/parts", context)} className="font-medium text-accent hover:underline">
          Continue browsing parts
        </Link>
      </p>
    </div>
  );
}

export function BasketView({ context }: { context: EquipmentContext | null }) {
  const { basket, hydrated } = useInquiryBasket();
  const [confirmClear, setConfirmClear] = useState(false);
  const [submitted, setSubmitted] = useState<{ reference: string; summary: string } | null>(null);
  const backAsset = useMemo(() => context ?? basketEquipment(basket), [context, basket]);

  return (
    <PartsSupportShell
      section="basket"
      title="Inquiry Basket"
      description="Review the parts you want quoted, then prepare a request for quotation. This is an inquiry, not a purchase order."
      breadcrumbs={[{ label: "Inquiry Basket" }]}
      context={context}
    >
      {!hydrated ? (
        <p className="flex items-center gap-2 py-10 text-sm text-ink-3">
          <Loader2 size={15} className="animate-spin" aria-hidden /> Loading Inquiry Basket…
        </p>
      ) : submitted ? (
        <Submitted
          reference={submitted.reference}
          summary={submitted.summary}
          context={context}
          backAsset={backAsset}
          onEdit={() => setSubmitted(null)}
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-4">
            <section className="overflow-hidden rounded-md border border-line bg-panel shadow-panel">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <ShoppingBasket size={16} aria-hidden /> Parts for quotation
                  <span className="font-mono text-xs font-normal tabular text-ink-3">
                    {basket.lines.length} line{basket.lines.length === 1 ? "" : "s"} · {totalQuantity(basket)} pcs requested
                  </span>
                </h2>
                {basket.lines.length > 0 &&
                  (confirmClear ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-ink-2">Remove all {basket.lines.length} lines?</span>
                      <button
                        type="button"
                        onClick={() => {
                          clearInquiry();
                          setConfirmClear(false);
                        }}
                        className="rounded bg-critical px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Clear basket
                      </button>
                      <button type="button" onClick={() => setConfirmClear(false)} className="text-xs font-medium text-ink-2 hover:underline">
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-critical"
                    >
                      <Trash2 size={13} aria-hidden /> Clear basket
                    </button>
                  ))}
              </header>
              {basket.lines.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <ShoppingBasket size={24} className="mx-auto text-ink-3" aria-hidden />
                  <p className="mt-2 text-sm font-semibold text-ink">Your Inquiry Basket is empty</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-ink-3">
                    Add parts from the catalog or from a component on an asset. For questions that do not involve specific parts, use
                    Contact Us.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Link
                      href={partsSupportHref("/parts", context)}
                      className="btn-primary px-3 py-1.5 text-sm"
                    >
                      <PackageSearch size={14} aria-hidden /> Browse Parts
                    </Link>
                    <Link
                      href={partsSupportHref("/contact", context)}
                      className="btn-secondary px-3 py-1.5 text-sm"
                    >
                      <Headset size={14} aria-hidden /> Contact Us
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {basket.lines.map((l) => (
                    <BasketLineRow key={l.key} line={l} context={context} />
                  ))}
                </ul>
              )}
            </section>

            {basket.lines.length > 0 && (
              <section className="rounded-md border border-line bg-panel p-4 shadow-panel">
                <label htmlFor="inquiry-note" className="text-sm font-semibold text-ink">
                  Inquiry note <span className="text-xs font-normal text-ink-3">(optional)</span>
                </label>
                <p className="mt-0.5 text-xs text-ink-3">
                  Context for the whole request, e.g. planned outage window. Notes are kept in this browser only; do not enter personal data.
                </p>
                <textarea
                  id="inquiry-note"
                  value={basket.note}
                  onChange={(e) => setInquiryNote(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  className="mt-2 w-full rounded-lg border border-line-strong bg-raised px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:shadow-glow"
                />
              </section>
            )}

            <p className="flex gap-1.5 text-2xs leading-snug text-ink-3">
              <Info size={12} className="mt-px shrink-0" aria-hidden />
              The basket is stored only in this browser (part references, quantities and notes; no contact details). Lines for the same part
              on different equipment are kept separate, and variants are never merged.
            </p>
          </div>

          <aside className="lg:sticky lg:top-18">
            <RFQForm
              basket={basket}
              context={context}
              onSubmitted={(reference, contact) =>
                setSubmitted({ reference, summary: formatInquirySummary(reference, contact, basket) })
              }
            />
          </aside>
        </div>
      )}
    </PartsSupportShell>
  );
}
