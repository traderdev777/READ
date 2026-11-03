"use client";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/motion/useReducedMotion";
import { cn } from "@/lib/cn";
import { Illustration } from "./Illustration";

const STEPS = [
  {
    name: "Collect",
    line: "Load the page in a real browser, the way any visitor would.",
    detail:
      "HTML, response headers, every network request, computed styles and a full-page screenshot. Nothing behind a login.",
    snippet: `GET https://linear.app/  200  h2  41.2 KB
headers   server: cloudflare · cf-cache-status: HIT
requests  86 (31 script, 9 css, 22 img, 6 font, 18 xhr)
captured  1440×900 + 390×844 screenshots`,
  },
  {
    name: "Fingerprint",
    line: "Match what came back against known stack signatures.",
    detail:
      "Framework bundles, CDN headers, analytics beacons, font hosts. Each match records the exact string it matched.",
    snippet: `match  /_next/static/chunks/app/  → Next.js (App Router)
match  x-vercel-id: bom1::iad1     → Vercel edge
match  cdn.segment.com/analytics   → Segment
miss   no generator meta, no wp-content`,
  },
  {
    name: "Compress",
    line: "Trim raw evidence to what a decision needs.",
    detail:
      "Minified bundles and long HTML become short excerpts with their source, so every claim stays checkable and cheap to analyse.",
    snippet: `script main-app.js        214 KB → 3 excerpts, 612 B
html    document           41 KB → 18 headings, 9 sections
css     tokens             9 colors, 2 families, 4 radii
evidence kept: 47 items, 6.1 KB`,
  },
  {
    name: "Analyze",
    line: "Turn evidence into findings with a confidence score.",
    detail:
      "Observed facts are Detected. Deductions are Inferred and say what they rest on. Problems are Risk, with a fix.",
    snippet: `detected  Next.js 16 App Router        96/100
inferred  Tailwind CSS (utility names)  62/100
risk      No Content-Security-Policy   fix: headers()
risk      LCP image 412 KB, no preload  fix: priority`,
  },
  {
    name: "Act",
    line: "Hand the findings to a builder: code, a plan or a prompt.",
    detail:
      "Explain any finding deeper, generate the code for one feature, or produce build prompts for an original app with the same structure.",
    snippet: `action  fix-headers     → next.config.ts (14 lines)
action  rebuild-section → PricingTable.tsx + .module.css
action  build-prompt    → 6 prompts, Antigravity format
output  original code and visuals, no copied assets`,
  },
] as const;

/**
 * Five steps, one active at a time. ≥768px: the section pins and scroll advances the
 * step and a thin red progress line. Below 768px or with reduced motion: a plain list.
 */
export function HowItWorks() {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (reduce || !root.current) return;
    let revert = () => {};
    let cancelled = false;
    // Loaded on demand: the pinned sequence is below the fold.
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
      ([{ default: gsap }, { ScrollTrigger }]) => {
        if (cancelled || !root.current) return;
        gsap.registerPlugin(ScrollTrigger);
        const mm = gsap.matchMedia();
        mm.add("(min-width: 768px)", () => {
          setPinned(true);
          const st = ScrollTrigger.create({
            trigger: root.current,
            start: "top top",
            end: `+=${STEPS.length * 70}%`,
            pin: true,
            scrub: true,
            onUpdate: (self) => {
              setActive(Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length)));
              if (bar.current) bar.current.style.transform = `scaleY(${self.progress})`;
            },
          });
          return () => {
            st.kill();
            setPinned(false);
          };
        });
        revert = () => mm.revert();
      },
    );
    return () => {
      cancelled = true;
      revert();
    };
  }, [reduce]);

  return (
    <section id="how" aria-labelledby="how-h" className="scroll-mt-16 border-t border-line">
      <div
        ref={root}
        className={cn(
          "mx-auto max-w-[1320px] px-5 md:px-10",
          pinned ? "flex min-h-dvh flex-col justify-center py-16" : "py-24",
        )}
      >
        <div className="mb-12 grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
          <div>
            <p className="mb-3 font-mono text-xs text-chrome-500">How it works</p>
            <h2 id="how-h" className="font-display text-3xl tracking-[var(--tracking-display)]">
              Five passes, one URL.
            </h2>
          </div>
          <p className="max-w-prose self-end text-chrome-300">
            Each pass has one job and hands a smaller, checkable artefact to the next. Nothing is
            guessed until the last two, and those guesses are labelled.
          </p>
        </div>

        {pinned ? (
          <div className="grid grid-cols-[2px_minmax(0,4fr)_minmax(0,6fr)] gap-x-8">
            <div className="relative bg-line" aria-hidden>
              <div
                ref={bar}
                className="absolute inset-0 origin-top bg-red-500"
                style={{ transform: "scaleY(0)" }}
              />
            </div>
            <ol className="grid content-start gap-1" aria-label="Steps">
              {STEPS.map((s, i) => (
                <li
                  key={s.name}
                  aria-current={i === active ? "step" : undefined}
                  className={cn(
                    "rounded-md px-4 py-3 transition-colors duration-[var(--dur-2)]",
                    i === active ? "bg-ink-900" : "",
                  )}
                >
                  <p className="flex items-baseline gap-3">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        i === active ? "text-red-500" : "text-chrome-500",
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "text-lg font-semibold tracking-tight",
                        i === active ? "text-chrome-100" : "text-chrome-500",
                      )}
                    >
                      {s.name}
                    </span>
                  </p>
                  {i === active && <p className="mt-1 pl-8 text-sm text-chrome-300">{s.line}</p>}
                </li>
              ))}
            </ol>
            <StepDetail step={STEPS[active]!} index={active} />
          </div>
        ) : (
          <ol className="grid gap-10">
            {STEPS.map((s, i) => (
              <li
                key={s.name}
                className="grid gap-4 border-l border-line pl-5 md:grid-cols-[minmax(0,4fr)_minmax(0,6fr)] md:gap-8"
              >
                <div>
                  <p className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-chrome-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-lg font-semibold tracking-tight">{s.name}</span>
                  </p>
                  <p className="mt-1 text-sm text-chrome-300">{s.line}</p>
                </div>
                <StepDetail step={s} index={i} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function StepDetail({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  return (
    <div className="grid content-start gap-4" aria-live="polite">
      <p className="text-chrome-300">{step.detail}</p>
      <figure className="overflow-hidden rounded-lg border border-line bg-ink-900">
        <figcaption className="flex h-9 items-center justify-between border-b border-line px-4">
          <span className="font-mono text-xs text-chrome-500">
            pass {index + 1} · {step.name.toLowerCase()}
          </span>
          <Illustration />
        </figcaption>
        <pre className="overflow-x-auto p-4 font-mono text-[12.5px] leading-6 text-chrome-100">
          {step.snippet}
        </pre>
      </figure>
    </div>
  );
}
