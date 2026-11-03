import { ShieldCheck, Split, LockKeyhole } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { ScanForm } from "@/components/landing/ScanForm";
import { HeroMark } from "@/components/landing/HeroMark";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { EvidenceCard } from "@/components/landing/Evidence";
import { Actions } from "@/components/landing/Actions";
import { Pricing } from "@/components/landing/Pricing";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { Footer } from "@/components/landing/Footer";
import { Badge } from "@/components/ui/Badge";
import { site } from "@/lib/brand";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "RED",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: site.url,
  description: site.description,
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/PreOrder",
    description: "Pricing announced at launch",
  },
};

const CHIPS = [
  [ShieldCheck, "Public evidence only"],
  [Split, "Detected vs Inferred"],
  [LockKeyhole, "No login bypass"],
] as const;

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-ink-800 focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        {/* Hero */}
        <section
          aria-labelledby="hero-h"
          className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-[1320px] items-center gap-12 px-5 py-16 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:px-10"
        >
          <div className="grid max-w-[720px] gap-7">
            <h1
              id="hero-h"
              className="font-display text-4xl leading-[1.08] tracking-[var(--tracking-display)] md:text-5xl"
            >
              Paste a link. See how it&apos;s built.
            </h1>
            <p className="max-w-[60ch] text-lg text-chrome-300">
              RED collects real evidence from any public site, labels what is detected vs inferred,
              then turns it into code and build prompts.
            </p>
            <ScanForm />
            <ul className="flex flex-wrap gap-2" aria-label="Scan guarantees">
              {CHIPS.map(([Icon, label]) => (
                <li
                  key={label}
                  className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-line px-2.5 font-mono text-xs text-chrome-300"
                >
                  <Icon aria-hidden strokeWidth={1.5} className="size-3.5 text-chrome-500" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mx-auto w-1/2 max-w-[420px] md:w-full">
              <HeroMark />
            </div>
          </div>
        </section>

        <HowItWorks />

        {/* Evidence */}
        <section
          id="evidence"
          aria-labelledby="evidence-h"
          className="cv-auto scroll-mt-16 border-t border-line"
        >
          <div className="mx-auto grid max-w-[1320px] gap-12 px-5 py-24 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:px-10">
            <div className="grid content-start gap-6">
              <p className="font-mono text-xs text-chrome-500">Evidence, not guesses</p>
              <h2
                id="evidence-h"
                className="font-display text-3xl tracking-[var(--tracking-display)]"
              >
                Every claim shows its source.
              </h2>
              <div className="grid gap-5 text-chrome-300">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                  <Badge level="detected" />
                  <span>
                    Seen directly in what the site sent: a header, a script path, a DOM node. You
                    can open the source and check it.
                  </span>
                </p>
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                  <Badge level="inferred" />
                  <span>
                    Deduced from indirect signals, with the signals listed. Treat it as a strong
                    lead, not a fact.
                  </span>
                </p>
                <p>
                  The confidence meter runs 0 to 100. Eighty and up is observed, forty to
                  seventy-nine is inferred, and anything lower is flagged rather than presented as
                  an answer.
                </p>
              </div>
            </div>
            <EvidenceCard />
          </div>
        </section>

        <Actions />

        {/* Trust and limits */}
        <section aria-labelledby="trust-h" className="cv-auto border-t border-line">
          <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-24 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12 md:px-10">
            <div>
              <p className="mb-3 font-mono text-xs text-chrome-500">Trust and limits</p>
              <h2 id="trust-h" className="font-display text-3xl tracking-[var(--tracking-display)]">
                What RED will not do.
              </h2>
            </div>
            <div className="grid gap-5 text-lg text-chrome-300">
              <p>
                RED analyses only what every visitor&apos;s browser receives. Never private APIs,
                logins or protected content.
              </p>
              <p>
                Rebuilds are original code and design. RED never copies branding, copy, images or
                source code from the site it analysed.
              </p>
            </div>
          </div>
        </section>

        <Pricing />

        {/* Waitlist */}
        <section
          id="waitlist"
          aria-labelledby="waitlist-h"
          className="cv-auto scroll-mt-16 border-t border-line"
        >
          <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-24 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-end md:gap-12 md:px-10">
            <div>
              <p className="mb-3 font-mono text-xs text-chrome-500">Waitlist</p>
              <h2
                id="waitlist-h"
                className="font-display text-3xl tracking-[var(--tracking-display)]"
              >
                Get the first scans.
              </h2>
              <p className="mt-4 text-chrome-300">
                Scans open in waves. Leave an email and you&apos;re in the first one.
              </p>
            </div>
            <WaitlistForm source="landing" />
          </div>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
