import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { validateScanUrl } from "@/lib/scan-url";
import { WaitlistForm } from "@/components/landing/WaitlistForm";

export const metadata: Metadata = { title: "Scan", robots: { index: false, follow: false } };

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url = "" } = await searchParams;
  const r = validateScanUrl(url);
  return (
    <main className="mx-auto grid min-h-dvh max-w-[960px] content-center gap-10 px-5 py-16 md:px-10">
      <Link href="/" className="w-fit rounded-sm" aria-label="RED home">
        <Logo height={28} title="" />
      </Link>
      {r.ok ? (
        <section aria-labelledby="scan-h" className="grid gap-6">
          <p className="font-mono text-xs uppercase tracking-wider text-inferred">
            Not connected yet
          </p>
          <h1 id="scan-h" className="font-display text-3xl tracking-[var(--tracking-display)]">
            Scanner connects in the next build step.
          </h1>
          <div className="rounded-lg border border-line bg-ink-900 p-4">
            <p className="font-mono text-xs text-chrome-500">Queued URL (validated, not fetched)</p>
            <p className="mt-1 break-all font-mono text-sm text-chrome-100">{r.url}</p>
          </div>
          <p className="max-w-prose text-chrome-300">
            The URL passed validation: https, public hostname, no private address. Nothing was
            requested from {r.host}. Join the waitlist and we&apos;ll email you when live scans
            open.
          </p>
          <WaitlistForm source="scan-page" />
        </section>
      ) : (
        <section aria-labelledby="scan-h" className="grid gap-6">
          <p className="font-mono text-xs uppercase tracking-wider text-red-500">
            Can&apos;t scan this URL
          </p>
          <h1 id="scan-h" className="font-display text-3xl tracking-[var(--tracking-display)]">
            {r.error}
          </h1>
          {url && <p className="break-all font-mono text-sm text-chrome-500">{url}</p>}
        </section>
      )}
      <Link
        href="/#scan"
        className="inline-flex w-fit items-center gap-2 rounded-sm text-sm text-chrome-300 hover:text-chrome-100"
      >
        <ArrowLeft aria-hidden strokeWidth={1.5} className="size-4" />
        Scan a different site
      </Link>
    </main>
  );
}
