"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CircleHelp, Headset, MessageSquare, PackageSearch, Send, Wrench, type LucideIcon } from "lucide-react";
import {
  CONTACT_TOPICS,
  demoReference,
  formatContactSummary,
  NOTHING_SENT_NOTICE,
  validateEmail,
  type ContactMessage,
  type ContactTopic,
} from "@/lib/parts/inquiry-summary";
import { assetHref, partsSupportHref } from "@/lib/parts/part-context";
import type { EquipmentContext } from "@/types/parts-commerce";
import { DemoSubmissionBanner, TextField } from "./BasketView";
import { CopyButton } from "./PartBits";
import { PartsSupportShell } from "./PartsSupportShell";

const TOPIC_ICON: Record<ContactTopic, LucideIcon> = {
  general: MessageSquare,
  technical: Headset,
  service: Wrench,
  parts: PackageSearch,
  other: CircleHelp,
};

type Field = Exclude<keyof ContactMessage, "topic">;

export function ContactView({ context, initialTopic }: { context: EquipmentContext | null; initialTopic: ContactTopic | null }) {
  const [topic, setTopic] = useState<ContactTopic | null>(initialTopic);
  const [fields, setFields] = useState<Record<Field, string>>({
    name: "",
    company: "",
    email: "",
    phone: "",
    // Optional context prefill; the user can clear it, equipment is never required.
    equipmentModel: context?.model ?? "",
    serialNumber: context?.serialNumber ?? "",
    site: context ? `${context.plantName} · ${context.unitName}` : "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field | "topic", string>>>({});
  const [submitted, setSubmitted] = useState<{ reference: string; summary: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const set = (k: Field) => (v: string) => {
    setFields((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!topic) next.topic = "Choose a topic.";
    if (!fields.name.trim()) next.name = "Enter a contact name.";
    if (!fields.company.trim()) next.company = "Enter a company.";
    if (!fields.email.trim()) next.email = "Enter an email address.";
    else if (!validateEmail(fields.email)) next.email = "Enter a valid email address, e.g. name@company.com.";
    if (fields.message.trim().length < 10) next.message = "Enter a message (at least 10 characters).";
    setErrors(next);
    if (Object.keys(next).length > 0) {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    const reference = demoReference("MSG");
    setSubmitted({ reference, summary: formatContactSummary(reference, { topic: topic!, ...fields }) });
  };

  return (
    <PartsSupportShell
      section="contact"
      title="Contact Us"
      description="Ask a general, technical, service or aftermarket question. No part selection is needed."
      breadcrumbs={[{ label: "Contact Us" }]}
      context={context}
    >
      {submitted ? (
        <div className="mx-auto max-w-3xl space-y-4">
          <DemoSubmissionBanner />
          <section className="rounded-md border border-line bg-panel p-5 shadow-panel">
            <div className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-3">Message prepared (not sent)</div>
            <h2 className="mt-1 text-xl font-semibold text-ink">Your message was not sent</h2>
            <p className="mt-1 text-sm text-ink-2">
              Demo reference <span className="font-mono font-semibold text-ink">{submitted.reference}</span> was generated in your browser
              and is not known to ANDRITZ. {NOTHING_SENT_NOTICE}
            </p>
            <label htmlFor="contact-summary" className="mt-4 block text-xs font-medium text-ink-2">
              Message summary
            </label>
            <textarea
              id="contact-summary"
              readOnly
              value={submitted.summary}
              rows={14}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-1 w-full rounded-lg border border-line-strong bg-sunken px-3.5 py-3 font-mono text-xs leading-relaxed text-ink"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <CopyButton text={submitted.summary} label="Copy Message" />
              <button
                type="button"
                onClick={() => setSubmitted(null)}
                className="btn-secondary px-3 py-1.5 text-sm"
              >
                <ArrowLeft size={14} aria-hidden /> Edit message
              </button>
              {context && (
                <Link
                  href={assetHref(context)}
                  className="btn-secondary px-3 py-1.5 text-sm"
                >
                  Back to {context.assetName}
                </Link>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form ref={formRef} onSubmit={submit} noValidate className="min-w-0 space-y-5">
            <fieldset className="rounded-md border border-line bg-panel p-4 shadow-panel">
              <legend className="sr-only">Topic</legend>
              <h2 className="text-sm font-semibold text-ink">
                What can we help with?<span className="text-critical"> *</span>
              </h2>
              <div role="radiogroup" aria-label="Topic" className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {CONTACT_TOPICS.map((t) => {
                  const Icon = TOPIC_ICON[t.id];
                  const selected = topic === t.id;
                  return (
                    <label
                      key={t.id}
                      className={`flex cursor-pointer gap-2.5 rounded border px-3 py-2.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/30 ${
                        selected ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong hover:bg-raised/70"
                      }`}
                    >
                      <input
                        type="radio"
                        name="topic"
                        value={t.id}
                        checked={selected}
                        onChange={() => {
                          setTopic(t.id);
                          setErrors((e) => ({ ...e, topic: undefined }));
                        }}
                        aria-invalid={errors.topic && t.id === CONTACT_TOPICS[0].id ? true : undefined}
                        className="sr-only"
                      />
                      <Icon size={17} className={`mt-0.5 shrink-0 ${selected ? "text-accent" : "text-ink-3"}`} aria-hidden />
                      <span>
                        <span className={`block text-sm ${selected ? "font-semibold text-accent" : "font-medium text-ink"}`}>{t.label}</span>
                        <span className="block text-xs text-ink-3">{t.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.topic && <p className="mt-2 text-2xs text-critical">{errors.topic}</p>}
            </fieldset>

            <section className="rounded-md border border-line bg-panel p-4 shadow-panel">
              <h2 className="text-sm font-semibold text-ink">Your details</h2>
              <p className="mt-0.5 text-xs text-ink-3">Used only to build the message summary on this page; not stored.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextField id="c-name" label="Contact name" value={fields.name} onChange={set("name")} required error={errors.name} autoComplete="name" />
                <TextField id="c-company" label="Company" value={fields.company} onChange={set("company")} required error={errors.company} autoComplete="organization" />
                <TextField id="c-email" label="Email" type="email" value={fields.email} onChange={set("email")} required error={errors.email} autoComplete="email" />
                <TextField id="c-phone" label="Phone" type="tel" value={fields.phone} onChange={set("phone")} autoComplete="tel" />
              </div>
            </section>

            <section className="rounded-md border border-line bg-panel p-4 shadow-panel">
              <h2 className="text-sm font-semibold text-ink">Equipment <span className="text-xs font-normal text-ink-3">(optional)</span></h2>
              <p className="mt-0.5 text-xs text-ink-3">
                {context ? `Prefilled from ${context.assetName}. Clear or change if your question is about something else.` : "Add equipment details if your question relates to a specific unit."}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <TextField id="c-model" label="Equipment model" value={fields.equipmentModel} onChange={set("equipmentModel")} />
                <TextField id="c-serial" label="Serial number" value={fields.serialNumber} onChange={set("serialNumber")} />
                <TextField id="c-site" label="Site / plant" value={fields.site} onChange={set("site")} />
              </div>
            </section>

            <section className="rounded-md border border-line bg-panel p-4 shadow-panel">
              <TextField
                id="c-message"
                label="Message"
                value={fields.message}
                onChange={set("message")}
                required
                error={errors.message}
                multiline
                placeholder="Describe your question or request."
              />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 text-sm"
                >
                  <Send size={15} aria-hidden /> Send message (demo)
                </button>
                <span className="text-2xs text-ink-3">Demo only: no email is sent and no ticket is created.</span>
              </div>
            </section>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-18">
            <div className="rounded-md border border-line bg-panel p-4 text-sm shadow-panel">
              <h2 className="font-semibold text-ink">Looking for specific parts?</h2>
              <p className="mt-1 text-xs text-ink-2">
                Use Parts Inquiry to search documented IK-700 parts, build an Inquiry Basket and request a quote.
              </p>
              <Link
                href={partsSupportHref("/parts", context)}
                className="mt-3 btn-secondary px-3 py-1.5 text-sm"
              >
                <PackageSearch size={14} aria-hidden /> Browse Parts
              </Link>
            </div>
            <p className="px-1 text-2xs leading-snug text-ink-3">
              This prototype does not connect to ANDRITZ systems. Submitting prepares a copyable summary only.
            </p>
          </aside>
        </div>
      )}
    </PartsSupportShell>
  );
}
