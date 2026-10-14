"use client";

/**
 * Inquiry Basket: a client-side, demo-only parts inquiry (not an order).
 *
 * Persisted in localStorage so it survives navigation and reload. Stored
 * content is limited to part identity, requested quantities, notes and the
 * demo equipment context: no drawings, no health readings and never contact
 * details (those stay in form state only).
 *
 * SSR-safe: the server snapshot is always the empty basket; `hydrated` turns
 * true only on the client, so UI can avoid flashing "empty" before load.
 */

import { useSyncExternalStore } from "react";
import type { CatalogPart, EquipmentContext, InquiryBasket, InquiryLine } from "@/types/parts-commerce";
import { sourceLabel } from "./catalog";
import { equipmentOf } from "./part-context";

const STORAGE_KEY = "ibis-inquiry-basket-v1";
const EVENT = "ibis-inquiry-basket";

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 999;

const EMPTY: InquiryBasket = { version: 1, lines: [], note: "" };

let cache: InquiryBasket | null = null;

function isLine(value: unknown): value is InquiryLine {
  const l = value as InquiryLine;
  return Boolean(
    l &&
      typeof l.key === "string" &&
      typeof l.partId === "string" &&
      typeof l.description === "string" &&
      Number.isInteger(l.quantity) &&
      Array.isArray(l.piReferences) &&
      Array.isArray(l.components),
  );
}

function load(): InquiryBasket {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<InquiryBasket>;
    if (parsed?.version !== 1 || !Array.isArray(parsed.lines)) return EMPTY;
    return {
      version: 1,
      lines: parsed.lines.filter(isLine).map((l) => ({ ...l, quantity: clampQuantity(l.quantity), note: l.note ?? "" })),
      note: typeof parsed.note === "string" ? parsed.note : "",
    };
  } catch {
    return EMPTY;
  }
}

function read(): InquiryBasket {
  if (!cache) cache = load();
  return cache;
}

function write(next: InquiryBasket) {
  cache = next;
  try {
    if (next.lines.length === 0 && !next.note) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode / quota): the basket still works for this page session.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    cache = null;
    onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const noopSubscribe = () => () => {};

/** Current basket plus whether client storage has been read yet. */
export function useInquiryBasket(): { basket: InquiryBasket; hydrated: boolean } {
  const basket = useSyncExternalStore(subscribe, read, () => EMPTY);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return { basket, hydrated };
}

export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return MIN_QUANTITY;
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.round(value)));
}

export function isValidQuantity(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_QUANTITY && value <= MAX_QUANTITY;
}

/**
 * Line identity: the catalog part plus the equipment it is requested for.
 * Different variants are different parts, so they never merge; the same
 * part for two different units stays on two lines.
 */
export function lineKey(partId: string, assetId: string | null): string {
  return `${partId}@${assetId ?? "unspecified"}`;
}

export function findLine(basket: InquiryBasket, partId: string, assetId: string | null): InquiryLine | null {
  return basket.lines.find((l) => l.key === lineKey(partId, assetId)) ?? null;
}

export interface AddLineInput {
  part: CatalogPart;
  quantity: number;
  context: EquipmentContext | null;
  source: InquiryLine["source"];
}

/**
 * Adds a line. Adding a part that is already in the basket for the same
 * equipment never duplicates it and never changes its quantity: the
 * originating component is recorded as provenance and "exists" is returned.
 */
export function addToInquiry({ part, quantity, context, source }: AddLineInput): "added" | "exists" {
  const basket = read();
  const key = lineKey(part.id, context?.assetId ?? null);
  const existing = basket.lines.find((l) => l.key === key);
  const component = context?.entityName ?? null;
  if (existing) {
    if (component && !existing.components.includes(component)) {
      const ids = context?.entityId ? [...(existing.componentIds ?? []), context.entityId] : existing.componentIds;
      write({
        ...basket,
        lines: basket.lines.map((l) => (l.key === key ? { ...l, components: [...l.components, component], componentIds: ids } : l)),
      });
    }
    return "exists";
  }
  const line: InquiryLine = {
    key,
    partId: part.id,
    description: part.description,
    partNumber: part.partNumber,
    partNumberStatus: part.partNumberStatus,
    piReferences: part.references.map(sourceLabel),
    confirmationRequired: part.confirmationReasons.length > 0,
    quantity: clampQuantity(quantity),
    note: "",
    equipment: equipmentOf(context),
    components: component ? [component] : [],
    componentIds: context?.entityId ? [context.entityId] : [],
    source,
    addedAt: new Date().toISOString(),
  };
  write({ ...basket, lines: [...basket.lines, line] });
  return "added";
}

function updateLine(key: string, patch: Partial<Pick<InquiryLine, "quantity" | "note">>) {
  const basket = read();
  write({ ...basket, lines: basket.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) });
}

export function setLineQuantity(key: string, quantity: number) {
  updateLine(key, { quantity: clampQuantity(quantity) });
}

export function setLineNote(key: string, note: string) {
  updateLine(key, { note: note.slice(0, 500) });
}

export function removeLine(key: string) {
  const basket = read();
  write({ ...basket, lines: basket.lines.filter((l) => l.key !== key) });
}

export function setInquiryNote(note: string) {
  write({ ...read(), note: note.slice(0, 2000) });
}

export function clearInquiry() {
  write(EMPTY);
}

/** Equipment shared by every line that names one; null when none or several units. */
export function basketEquipment(basket: InquiryBasket): (NonNullable<InquiryLine["equipment"]> & { entityId: string | null }) | null {
  const withEquipment = basket.lines.filter((l) => l.equipment);
  const ids = new Set(withEquipment.map((l) => l.equipment!.assetId));
  if (ids.size !== 1) return null;
  const entityId = withEquipment.find((l) => l.componentIds?.length)?.componentIds?.[0] ?? null;
  return { ...withEquipment[0].equipment!, entityId };
}

export function totalQuantity(basket: InquiryBasket): number {
  return basket.lines.reduce((sum, l) => sum + l.quantity, 0);
}
