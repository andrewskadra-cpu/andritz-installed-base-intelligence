"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Boxes, ClipboardList, FileSearch, Headset, PackageSearch, Search, ShoppingBasket, Users } from "lucide-react";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/parts/catalog";
import { CONTACT_TOPICS } from "@/lib/parts/inquiry-summary";
import { partsSupportHref } from "@/lib/parts/part-context";
import type { EquipmentContext } from "@/types/parts-commerce";
import { BasketCount, PartsSupportShell } from "./PartsSupportShell";
import { usePartsCatalog } from "./usePartsCatalog";

const STEPS = [
  { icon: FileSearch, title: "Find the part", text: "Search by part number, PI item, description or the component on your asset." },
  { icon: ShoppingBasket, title: "Build an inquiry", text: "Collect parts and quantities in the Inquiry Basket, with notes per line." },
  { icon: Users, title: "ANDRITZ confirms", text: "Identification, compatibility, pricing, availability and delivery are confirmed by a representative." },
];

export function LandingView({ context }: { context: EquipmentContext | null }) {
  const router = useRouter();
  const state = usePartsCatalog();
  const [query, setQuery] = useState("");
  const catalog = state.status === "ready" ? state.catalog : null;

  const search = (e: FormEvent) => {
    e.preventDefault();
    router.push(partsSupportHref("/parts", context, { q: query.trim() }));
  };

  return (
    <PartsSupportShell
      section="home"
      title="Parts & Support"
      description="Request quotes for documented IK-700 parts, or contact ANDRITZ for technical, service and aftermarket support."
      context={context}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* Parts Inquiry */}
        <section className="flex flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
          <header className="relative flex items-center justify-between gap-3 overflow-hidden border-b border-line bg-[linear-gradient(120deg,var(--color-accent-soft),var(--color-panel)_70%)] px-6 py-5">
            <div className="flex items-center gap-3.5">
              <span className="grid size-11 place-items-center rounded-xl border border-accent/40 bg-accent/15 text-accent shadow-glow">
                <PackageSearch size={21} aria-hidden />
              </span>
              <div>
                <div className="eyebrow">Workflow 1</div>
                <h2 className="text-xl font-semibold tracking-tight text-ink">Parts Inquiry</h2>
              </div>
            </div>
            <Link
              href={partsSupportHref("/basket", context)}
              className="btn-secondary px-3.5 py-2 text-sm"
            >
              <ShoppingBasket size={15} aria-hidden /> Inquiry Basket <BasketCount />
            </Link>
          </header>
          <div className="flex-1 space-y-6 p-6">
            <form onSubmit={search} role="search">
              <label htmlFor="landing-search" className="text-base font-semibold text-ink">
                Search IK-700 parts
              </label>
              <div className="mt-2 flex gap-2">
                <span className="relative flex-1">
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
                  <input
                    id="landing-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Part number, PI item, description or component"
                    className="h-12 w-full rounded-lg border border-line-strong bg-raised pl-10 pr-3 text-sm text-ink transition-shadow placeholder:text-ink-3 focus:border-accent focus:shadow-glow focus:outline-none"
                  />
                </span>
                <button type="submit" className="btn-primary h-12 px-5 text-sm">
                  Search
                </button>
              </div>
              <p className="mt-2 text-xs text-ink-3">
                Try <span className="font-mono">worm gear</span>, <span className="font-mono">36</span> or{" "}
                <span className="font-mono">bearing</span>.
              </p>
            </form>

            <div>
              <h3 className="eyebrow">Browse parts by assembly</h3>
              {catalog ? (
                <Link
                  href={partsSupportHref("/parts", context)}
                  className="group mt-2.5 flex items-center justify-between gap-3 rounded-lg border border-line bg-sunken/60 px-4 py-3.5 transition-all hover:border-accent/50 hover:bg-raised/60"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-raised text-cyan">
                      <Boxes size={20} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-semibold text-ink">{catalog.assembly}</span>
                      <span className="block text-xs text-ink-3">
                        {catalog.family} carriage / gearbox · {catalog.formLabel} ·{" "}
                        <span className="font-mono tabular">{catalog.parts.length}</span> indexed parts
                      </span>
                    </span>
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                </Link>
              ) : (
                <p className="mt-2.5 rounded-lg border border-dashed border-line-strong px-4 py-3 text-xs text-ink-3">
                  {state.status === "loading" ? "Loading catalog…" : "Parts catalog data is not available in this environment. Contact Us can still help identify parts."}
                </p>
              )}
              {catalog && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {CATEGORY_ORDER.filter((c) => catalog.parts.some((p) => p.category === c)).map((c) => (
                    <li key={c}>
                      <Link
                        href={partsSupportHref("/parts", context, { category: c })}
                        className="inline-block rounded-full border border-line bg-raised/60 px-3 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-accent/50 hover:bg-accent-soft hover:text-ink"
                      >
                        {CATEGORY_LABEL[c]}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <ol className="grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent-soft font-mono text-xs font-semibold text-accent">
                    {i + 1}
                  </span>
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                      <s.icon size={14} className="text-ink-3" aria-hidden /> {s.title}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-3">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Contact Us */}
        <section className="flex flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-panel">
          <header className="flex items-center gap-3.5 border-b border-line bg-[linear-gradient(120deg,rgb(48_203_232/0.10),var(--color-panel)_70%)] px-6 py-5">
            <span className="grid size-11 place-items-center rounded-xl border border-cyan/35 bg-cyan/10 text-cyan">
              <Headset size={21} aria-hidden />
            </span>
            <div>
              <div className="eyebrow">Workflow 2</div>
              <h2 className="text-xl font-semibold tracking-tight text-ink">Contact Us</h2>
            </div>
          </header>
          <div className="flex flex-1 flex-col p-6">
            <p className="text-sm text-ink-2">For questions that do not involve selecting parts. Choose a topic to start.</p>
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-sunken/50">
              {CONTACT_TOPICS.map((t) => (
                <li key={t.id}>
                  <Link
                    href={partsSupportHref("/contact", context, { topic: t.id })}
                    className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-raised/70"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{t.label}</span>
                      <span className="block truncate text-xs text-ink-3">{t.hint}</span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href={partsSupportHref("/contact", context)}
              className="btn-secondary mt-5 px-3 py-2.5 text-sm"
            >
              <Headset size={15} aria-hidden /> Contact ANDRITZ
            </Link>
          </div>
        </section>
      </div>

      <p className="mt-7 flex gap-2 rounded-lg border border-line bg-sunken/60 px-4 py-3 text-xs leading-relaxed text-ink-2">
        <ClipboardList size={15} className="mt-0.5 shrink-0 text-cyan" aria-hidden />
        Parts & Support is an inquiry workflow. It does not place orders, show prices or stock, or commit to delivery. In this prototype,
        submissions are simulated and nothing is sent to ANDRITZ.
      </p>
    </PartsSupportShell>
  );
}
