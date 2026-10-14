import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";

export default function NotFound() {
  return (
    <>
      <TopBar breadcrumbs={[{ label: "Overview", href: "/overview" }, { label: "Not found" }]} />
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-ink">Record not found</h1>
        <p className="mt-2 text-sm text-ink-2">
          This customer, plant or asset is not in the demo installed base.
        </p>
        <Link
          href="/overview"
          className="btn-primary mt-6 px-4 py-2 text-sm"
        >
          Back to Overview
        </Link>
      </main>
    </>
  );
}
