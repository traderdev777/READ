import { Check } from "lucide-react";

const TIERS = [
  {
    name: "Free",
    for: "Trying RED on a few sites",
    items: [
      "Limited scans per month",
      "Detected and Inferred findings",
      "Evidence for every claim",
    ],
  },
  {
    name: "Pro",
    for: "Builders shipping their own products",
    items: ["Deep teardowns", "Code generation per finding", "Antigravity build prompts"],
    featured: true,
  },
  {
    name: "Agency",
    for: "Teams delivering for clients",
    items: ["Everything in Pro", "White-label reports", "Shared workspace"],
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-h"
      className="cv-auto scroll-mt-16 border-t border-line"
    >
      <div className="mx-auto max-w-[1320px] px-5 py-24 md:px-10">
        <div className="mb-12 grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
          <div>
            <p className="mb-3 font-mono text-xs text-chrome-500">Pricing</p>
            <h2 id="pricing-h" className="font-display text-3xl tracking-[var(--tracking-display)]">
              Three tiers.
            </h2>
          </div>
          <p className="max-w-prose self-end text-chrome-300">
            Pricing is announced at launch. Join the waitlist and you&apos;ll see it before anyone
            else.
          </p>
        </div>
        <ul className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_minmax(0,4fr)]">
          {TIERS.map((t) => (
            <li key={t.name} className="relative grid content-start gap-5 bg-ink-900 p-6 md:p-8">
              {t.featured && (
                <span aria-hidden className="absolute inset-x-8 top-0 h-px bg-red-500" />
              )}
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{t.name}</h3>
                <p className="mt-1 text-sm text-chrome-500">{t.for}</p>
              </div>
              <p className="font-mono text-sm text-chrome-300">Pricing announced at launch</p>
              <ul className="grid gap-2 text-sm text-chrome-300">
                {t.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <Check
                      aria-hidden
                      strokeWidth={1.5}
                      className="mt-0.5 size-4 shrink-0 text-chrome-500"
                    />
                    {i}
                  </li>
                ))}
              </ul>
              <a
                href="#waitlist"
                className="mt-2 inline-flex h-10 w-fit items-center rounded-md border border-line px-4 text-sm font-medium text-chrome-100 transition-colors duration-[var(--dur-1)] hover:border-chrome-500 hover:bg-ink-800 focus-visible:shadow-glow"
              >
                Join the waitlist<span className="sr-only"> for {t.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
