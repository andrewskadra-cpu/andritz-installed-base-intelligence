import type { Metadata } from "next";
import { CatalogView } from "@/components/parts-support/CatalogView";
import { getPartsContext } from "@/lib/installed-base";
import { CATEGORY_ORDER } from "@/lib/parts/catalog";
import { param } from "@/lib/parts/search-params";
import type { PartCategory } from "@/types/parts-commerce";

export const metadata: Metadata = { title: "Browse Parts · Parts & Support" };

export default async function PartsCatalogPage({ searchParams }: PageProps<"/parts-support/parts">) {
  const sp = await searchParams;
  const context = await getPartsContext(param(sp, "asset"), param(sp, "entity"));
  const category = param(sp, "category");
  return (
    <CatalogView
      context={context}
      initialQuery={param(sp, "q") ?? ""}
      initialCategory={CATEGORY_ORDER.includes(category as PartCategory) ? (category as PartCategory) : null}
      initialSheet={param(sp, "sheet")}
    />
  );
}
