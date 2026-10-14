import type { Metadata } from "next";
import { ContactView } from "@/components/parts-support/ContactView";
import { getPartsContext } from "@/lib/installed-base";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/parts/inquiry-summary";
import { param } from "@/lib/parts/search-params";

export const metadata: Metadata = { title: "Contact Us · Parts & Support" };

export default async function ContactPage({ searchParams }: PageProps<"/parts-support/contact">) {
  const sp = await searchParams;
  const context = await getPartsContext(param(sp, "asset"), param(sp, "entity"));
  const topic = param(sp, "topic");
  const initialTopic = CONTACT_TOPICS.some((t) => t.id === topic) ? (topic as ContactTopic) : null;
  return <ContactView key={initialTopic ?? "none"} context={context} initialTopic={initialTopic} />;
}
