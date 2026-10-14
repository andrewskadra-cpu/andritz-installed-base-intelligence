/**
 * Plain-text summaries for the simulated submissions, for the user to copy
 * into their own message. Nothing here transmits anything.
 */

import type { InquiryBasket } from "@/types/parts-commerce";

export const NOT_AN_ORDER_NOTICE =
  "Submitting an inquiry does not place an order. Part identification, compatibility, pricing, availability and delivery will be confirmed by an ANDRITZ representative.";

export const NOTHING_SENT_NOTICE =
  "Demo only: nothing was sent to ANDRITZ. No email, ticket or order was created.";

/** Demo-only reference, e.g. DEMO-RFQ-20261013-4F7K. Not issued by any ANDRITZ system. */
export function demoReference(kind: "RFQ" | "MSG"): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `DEMO-${kind}-${date}-${random}`;
}

export interface ContactDetails {
  name: string;
  company: string;
  email: string;
  phone: string;
  site: string;
  equipmentModel: string;
  serialNumber: string;
  notes: string;
}

const line = (label: string, value: string) => (value.trim() ? `${label}: ${value.trim()}` : null);

export function formatInquirySummary(reference: string, contact: ContactDetails, basket: InquiryBasket): string {
  const parts = basket.lines.map((l, i) => {
    const pn =
      l.partNumber === null
        ? "Part no.: not listed"
        : `Part no.: ${l.partNumber}${l.partNumberStatus === "bracketed" ? " (shown in brackets on PI)" : ""}`;
    return [
      `${i + 1}. ${l.description}`,
      `   ${pn}`,
      `   Document reference: ${l.piReferences.join("; ")} (PI item numbers are drawing positions, not part numbers)`,
      `   Requested quantity: ${l.quantity}`,
      l.equipment ? `   Equipment: ${l.equipment.model} s/n ${l.equipment.serialNumber} (${l.equipment.assetName}, ${l.equipment.plantName})` : "   Equipment: not specified",
      l.components.length ? `   Related component: ${l.components.join(", ")}` : null,
      l.confirmationRequired ? "   Reference confirmation required" : null,
      l.note.trim() ? `   Note: ${l.note.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "PARTS INQUIRY / REQUEST FOR QUOTATION (DEMO)",
    `Demo reference: ${reference}`,
    "",
    "Contact",
    line("Name", contact.name),
    line("Company", contact.company),
    line("Email", contact.email),
    line("Phone", contact.phone),
    line("Plant/site", contact.site),
    "",
    "Equipment",
    line("Model", contact.equipmentModel) ?? "Model: not specified",
    line("Serial number", contact.serialNumber) ?? "Serial number: not specified",
    "",
    `Requested parts (${basket.lines.length} line${basket.lines.length === 1 ? "" : "s"})`,
    ...parts,
    "",
    basket.note.trim() ? `Inquiry note: ${basket.note.trim()}` : null,
    contact.notes.trim() ? `Additional notes: ${contact.notes.trim()}` : null,
    "",
    NOT_AN_ORDER_NOTICE,
    NOTHING_SENT_NOTICE,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export const CONTACT_TOPICS = [
  { id: "general", label: "General question", hint: "Anything about your ANDRITZ equipment or this portal." },
  { id: "technical", label: "Technical support", hint: "Operation, troubleshooting or engineering questions." },
  { id: "service", label: "Service request", hint: "Field service, inspection or outage support." },
  { id: "parts", label: "Parts assistance", hint: "Help identifying a part or reference. No selection needed." },
  { id: "other", label: "Other", hint: "Aftermarket, sales or anything else." },
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number]["id"];

export interface ContactMessage {
  topic: ContactTopic;
  name: string;
  company: string;
  email: string;
  phone: string;
  equipmentModel: string;
  serialNumber: string;
  site: string;
  message: string;
}

export function formatContactSummary(reference: string, m: ContactMessage): string {
  const topic = CONTACT_TOPICS.find((t) => t.id === m.topic)?.label ?? m.topic;
  return [
    "CONTACT ANDRITZ (DEMO)",
    `Demo reference: ${reference}`,
    `Topic: ${topic}`,
    "",
    line("Name", m.name),
    line("Company", m.company),
    line("Email", m.email),
    line("Phone", m.phone),
    line("Plant/site", m.site),
    line("Equipment model", m.equipmentModel),
    line("Serial number", m.serialNumber),
    "",
    "Message",
    m.message.trim(),
    "",
    NOTHING_SENT_NOTICE,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}
