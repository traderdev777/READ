import { CodeBlock } from "@/components/ui/CodeBlock";
import { Reveal } from "@/motion/Reveal";
import { Illustration } from "./Illustration";

const ACTIONS = [
  {
    name: "Explain deeper",
    text: "Ask why a finding matters and get the reasoning with the evidence attached.",
    file: "explain.md",
    lang: "md",
    code: `## Why the hero image delays LCP
The LCP element is <img src="/hero.jpg"> (412 KB).
It is discovered after main.css finishes (request #14),
and has no fetchpriority or preload.
Fix: serve AVIF at 1600w and add priority to <Image>.`,
  },
  {
    name: "Generate code for a feature",
    text: "Pick a section or a fix and get working code for your stack.",
    file: "next.config.ts",
    lang: "ts",
    code: `export default {
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "Content-Security-Policy", value: "default-src 'self'" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ]}];
  },
};`,
  },
  {
    name: "Build a similar app, original visuals",
    text: "Same structure and capabilities, your brand. No copied code, copy or images.",
    file: "app/page.tsx",
    lang: "tsx",
    code: `export default function Home() {
  return (
    <>
      <Hero title="Ship invoices in one click" />
      <FeatureGrid items={features} />   {/* 3 → your 4 */}
      <Pricing plans={plans} />
    </>
  );
}`,
  },
  {
    name: "Generate Antigravity build prompts",
    text: "A sequenced set of prompts an agent can execute, one milestone at a time.",
    file: "prompts/03-pricing.md",
    lang: "md",
    code: `# Prompt 3 of 6 · Pricing
Build /pricing with three tiers from plans.ts.
Monthly/annual toggle, annual shows "2 months free".
Use the Button and Card components. No new colors.
Acceptance: keyboard reachable, Lighthouse a11y >= 95.`,
  },
];

export function Actions() {
  return (
    <section
      id="actions"
      aria-labelledby="actions-h"
      className="cv-auto scroll-mt-16 border-t border-line"
    >
      <div className="mx-auto max-w-[1320px] px-5 py-24 md:px-10">
        <div className="mb-12 grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
          <div>
            <p className="mb-3 font-mono text-xs text-chrome-500">Actions</p>
            <h2 id="actions-h" className="font-display text-3xl tracking-[var(--tracking-display)]">
              Findings you can build on.
            </h2>
          </div>
          <p className="max-w-prose self-end text-chrome-300">
            Every finding carries a next step. Pick one and RED produces the artefact: an
            explanation, a patch, a scaffold or a prompt sequence.
          </p>
        </div>
        <Reveal stagger className="grid gap-x-10 gap-y-12 md:grid-cols-2">
          {ACTIONS.map((a, i) => (
            <article
              key={a.name}
              className="grid h-full content-start gap-4"
              style={{ marginTop: `calc(var(--space-6) * ${i % 2})` }}
            >
              <header>
                <p className="font-mono text-xs text-chrome-500">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">{a.name}</h3>
                <p className="mt-1 text-sm text-chrome-300">{a.text}</p>
              </header>
              <CodeBlock title={a.file} language={a.lang} code={a.code} />
              <Illustration />
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
