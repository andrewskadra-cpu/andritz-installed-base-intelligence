import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";

export default function NotFound() {
  return (
    <>
      <TopBar breadcrumbs={[{ label: "Installed base", href: "/" }, { label: "Not found" }]} />
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-ink">Record not found</h1>
        <p className="mt-2 text-sm text-ink-2">
          This customer, plant or asset is not in the demo installed base.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800"
        >
          Back to search
        </Link>
      </main>
    </>
  );
}
