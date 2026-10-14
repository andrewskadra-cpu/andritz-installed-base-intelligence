import type { Metadata } from "next";
import { BasketView } from "@/components/parts-support/BasketView";
import { getPartsContext } from "@/lib/installed-base";
import { param } from "@/lib/parts/search-params";

export const metadata: Metadata = { title: "Inquiry Basket · Parts & Support" };

export default async function InquiryBasketPage({ searchParams }: PageProps<"/parts-support/basket">) {
  const sp = await searchParams;
  const context = await getPartsContext(param(sp, "asset"), param(sp, "entity"));
  return <BasketView context={context} />;
}
