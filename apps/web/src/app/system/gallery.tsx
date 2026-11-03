"use client";
import Image from "next/image";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowRight, Download, Gauge, ScanSearch, ShieldAlert, Trash2, Wrench } from "lucide-react";
import {
  Badge,
  BadgeSkeleton,
  Button,
  ButtonSkeleton,
  Card,
  CardSkeleton,
  CodeBlock,
  ConfidenceMeter,
  Input,
  InputSkeleton,
  Logo,
  Tabs,
  Tooltip,
  useToast,
} from "@/components/ui";
import { MagneticButton, PixelDissolve, Reveal, ScanLine } from "@/motion";
import { setForcedReducedMotion, usePrefersReducedMotion } from "@/motion/useReducedMotion";
import { cn } from "@/lib/cn";

const SECTIONS = [
  ["brand", "Brand"],
  ["color", "Color"],
  ["type", "Type"],
  ["space", "Space, radius, glow"],
  ["motion", "Motion"],
  ["button", "Button"],
  ["input", "Input"],
  ["badge", "Badge"],
  ["card", "Card"],
  ["tabs", "Tabs"],
  ["code", "CodeBlock"],
  ["tooltip", "Tooltip"],
  ["meter", "ConfidenceMeter"],
  ["toast", "Toast"],
  ["rules", "Rules"],
] as const;

const COLORS: { group: string; items: [string, string][] }[] = [
  {
    group: "Ink",
    items: [
      ["--ink-950", "Page"],
      ["--ink-900", "Surface"],
      ["--ink-800", "Raised"],
      ["--line", "Borders"],
    ],
  },
  {
    group: "Signal",
    items: [
      ["--red-500", "Action, focus, risk"],
      ["--red-600", "Pressed"],
      ["--red-900", "Low-emphasis red on ink"],
    ],
  },
  {
    group: "Chrome",
    items: [
      ["--chrome-100", "Primary text"],
      ["--chrome-300", "Secondary text"],
      ["--chrome-500", "Tertiary text, idle icons"],
    ],
  },
  {
    group: "Status",
    items: [
      ["--detected", "Observed directly"],
      ["--inferred", "Deduced from signals"],
      ["--risk", "Needs a fix"],
    ],
  },
];

const TYPE: [string, string, string, string][] = [
  ["--text-5xl", "5xl · 61", "font-display", "Read the build."],
  ["--text-4xl", "4xl · 48.8", "font-display", "Evidence first"],
  ["--text-3xl", "3xl · 39", "font-display", "Stack report"],
  ["--text-2xl", "2xl · 31.25", "font-sans font-semibold", "14 findings, 3 need action"],
  ["--text-xl", "xl · 25", "font-sans font-semibold", "Render-blocking CSS on first paint"],
  [
    "--text-lg",
    "lg · 20",
    "font-sans",
    "Largest Contentful Paint is the hero image, 412 KB, not preloaded.",
  ],
  [
    "--text-base",
    "base · 16",
    "font-sans",
    "Each claim links to the header, request or DOM node it came from. Inferred claims say what they were inferred from.",
  ],
  [
    "--text-sm",
    "sm · 12.8",
    "font-mono",
    "x-powered-by: Next.js · /_next/static/chunks/main-app.js",
  ],
  [
    "--text-xs",
    "xs · 10.24",
    "font-mono uppercase tracking-wider",
    "Captured 2026-11-03 18:20 IST",
  ],
];

const CSS_SAMPLE = `// next.config.ts
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

export default {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};`;

/** Reads a token's live value from the stylesheet, so the gallery can never drift from tokens.css. */
function useTokenValue(name: string) {
  return useSyncExternalStore(
    () => () => {},
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    () => "",
  );
}

function Section({
  id,
  n,
  title,
  lede,
  children,
}: {
  id: string;
  n: number;
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-8 border-t border-line py-16 first:border-t-0 first:pt-0"
    >
      <div className="mb-10 grid gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
        <div>
          <p className="mb-3 font-mono text-xs text-chrome-500">{String(n).padStart(2, "0")}</p>
          <h2
            id={`${id}-h`}
            className="font-display text-2xl tracking-[var(--tracking-display)] text-chrome-100"
          >
            {title}
          </h2>
        </div>
        <p className="max-w-prose self-end text-chrome-300">{lede}</p>
      </div>
      {children}
    </section>
  );
}

/** A labelled cell in a state matrix. */
function State({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid content-start gap-3", className)}>
      <span className="font-mono text-xs uppercase tracking-wider text-chrome-500">{label}</span>
      <div className="flex min-h-12 flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function Swatch({ name, role }: { name: string; role: string }) {
  const value = useTokenValue(name);
  return (
    <div className="grid grid-cols-[48px_1fr] items-center gap-4 py-3">
      <span
        className="size-12 rounded-md border border-line"
        style={{ background: `var(${name})` }}
      />
      <div className="min-w-0">
        <p className="font-mono text-sm text-chrome-100">{name}</p>
        <p className="text-xs text-chrome-500">
          <span className="font-mono uppercase">{value || "…"}</span> · {role}
        </p>
      </div>
    </div>
  );
}

function EaseCurve({ name, d, token }: { name: string; d: string; token: string }) {
  return (
    <figure className="grid gap-3">
      <svg
        viewBox="0 0 100 100"
        className="aspect-square w-full max-w-40 rounded-md border border-line bg-ink-900"
        role="img"
        aria-label={`${name} easing curve`}
      >
        <path
          d="M0 100 L100 0"
          stroke="var(--line)"
          strokeWidth="0.6"
          strokeDasharray="2 2"
          fill="none"
        />
        <path d={d} stroke="var(--chrome-100)" strokeWidth="1.5" fill="none" />
      </svg>
      <figcaption>
        <p className="text-sm text-chrome-100">{name}</p>
        <p className="font-mono text-xs text-chrome-500">{token}</p>
      </figcaption>
    </figure>
  );
}

export function SystemGallery() {
  const reduce = usePrefersReducedMotion();
  const { push } = useToast();
  const [scanning, setScanning] = useState(false);
  const [resolved, setResolved] = useState(true);
  const [url, setUrl] = useState("https://stripe.com");
  const urlError =
    url && !/^https?:\/\/[^\s.]+\.[^\s]+$/.test(url)
      ? "Enter a full URL, including https://"
      : undefined;
  const [meter, setMeter] = useState(86);

  return (
    <div className="mx-auto grid max-w-[1320px] gap-10 px-6 pb-24 pt-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:px-10">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-ink-800 focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      {/* Index rail */}
      <aside className="lg:sticky lg:top-10 lg:h-[calc(100dvh-5rem)]">
        <Logo height={28} />
        <p className="mt-4 font-mono text-xs uppercase tracking-wider text-chrome-500">
          Design system · v0.1
        </p>
        <nav aria-label="Sections" className="mt-8 hidden lg:block">
          <ol className="grid gap-1.5">
            {SECTIONS.map(([id, label], i) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="group flex items-baseline gap-3 rounded-sm py-0.5 text-sm text-chrome-500 transition-colors duration-[var(--dur-1)] hover:text-chrome-100"
                >
                  <span className="font-mono text-xs text-chrome-500 group-hover:text-red-500">
                    {String(i).padStart(2, "0")}
                  </span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="mt-8 rounded-md border border-line p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-chrome-300">
            Reduced motion
            <input
              type="checkbox"
              role="switch"
              checked={reduce}
              onChange={(e) => setForcedReducedMotion(e.target.checked)}
              className="size-4 accent-[var(--red-500)]"
            />
          </label>
          <p className="mt-2 text-xs text-chrome-500">
            Follows your OS setting. Switch on to preview every primitive without motion.
          </p>
        </div>
      </aside>

      <main id="main" className="min-w-0">
        <header className="mb-20 grid gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:items-end">
          <h1 className="font-display text-5xl leading-[1.05] tracking-[var(--tracking-display)] text-chrome-100">
            Every token,
            <br />
            every state.
          </h1>
          <p className="text-chrome-300">
            The working reference for RED&apos;s interface. Components here are the production ones,
            wired to the same tokens. Hover, focus and tab through them; the forced rows show states
            you can&apos;t hold with a pointer.
          </p>
        </header>

        <Section
          id="brand"
          n={0}
          title="Brand"
          lede="Signal-red R with a chrome stem, trailing pixels and a </> glyph; chrome wordmark with one red bar. Drawn as SVG and swappable for the final vector via the src prop."
        >
          <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-[2fr_1fr]">
            <div className="flex min-h-56 items-center justify-center bg-ink-950 p-10">
              <Logo height={96} />
            </div>
            <div className="grid gap-px bg-line">
              <div className="flex items-center gap-6 bg-ink-900 p-6">
                <Logo variant="mark" height={56} />
                <p className="font-mono text-xs text-chrome-500">
                  variant=&quot;mark&quot; · favicon, avatar, loading
                </p>
              </div>
              <div className="flex items-center gap-6 bg-ink-900 p-6">
                <Logo variant="wordmark" height={32} />
                <p className="font-mono text-xs text-chrome-500">variant=&quot;wordmark&quot;</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-end gap-8">
            {[16, 24, 32, 48].map((h) => (
              <div key={h} className="grid gap-2">
                <Logo height={h} title="" />
                <span className="font-mono text-xs text-chrome-500">{h}px</span>
              </div>
            ))}
            <p className="ml-auto max-w-xs text-xs text-chrome-500">
              Minimum height 16px. Clear space equals the height of the E&apos;s red bar on every
              side.
            </p>
          </div>
          <figure className="mt-10 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-end md:gap-12">
            <Image
              src="/brand/red-logo.webp"
              alt="RED brand artwork: red R mark with pixel squares, a code glyph and an orbit swoosh, beside the chrome RED wordmark"
              width={1600}
              height={533}
              className="w-full rounded-lg border border-line"
              priority={false}
            />
            <figcaption className="text-xs text-chrome-500">
              <span className="font-mono text-chrome-300">/brand/red-logo.webp</span>
              <br />
              Source artwork, 1600 × 533, raster on black. Use it for social cards and decks. In the
              interface use the SVG <span className="font-mono">&lt;Logo /&gt;</span>; pass{" "}
              <span className="font-mono">src</span> once a vector master exists.
            </figcaption>
          </figure>
        </Section>

        <Section
          id="color"
          n={1}
          title="Color"
          lede="Black, one signal red, chrome. Red marks action and signal only and stays under 8% of any screen. Status colours belong to evidence, never to decoration."
        >
          <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
            {COLORS.map((g) => (
              <div key={g.group}>
                <h3 className="mb-1 font-mono text-xs uppercase tracking-wider text-chrome-500">
                  {g.group}
                </h3>
                <div className="divide-y divide-line">
                  {g.items.map(([n, r]) => (
                    <Swatch key={n} name={n} role={r} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-3 md:w-2/3">
            <p className="text-sm text-chrome-300">
              Red budget, measured as share of pixels on a typical results screen
            </p>
            <div
              className="flex h-3 overflow-hidden rounded-sm"
              role="img"
              aria-label="Approximate screen composition: 78% ink, 15% chrome text, 4% status, 3% red"
            >
              <span className="bg-ink-800" style={{ width: "78%" }} />
              <span className="bg-chrome-500" style={{ width: "15%" }} />
              <span className="bg-detected" style={{ width: "4%" }} />
              <span className="bg-red-500" style={{ width: "3%" }} />
            </div>
            <p className="font-mono text-xs text-chrome-500">
              ink 78 · chrome 15 · status 4 · red 3 (cap 8)
            </p>
          </div>
        </Section>

        <Section
          id="type"
          n={2}
          title="Type"
          lede="Michroma for the wordmark, heroes and section titles, used sparingly. Inter Tight for reading. JetBrains Mono for code, URLs and evidence. 1.25 ratio, fluid with clamp()."
        >
          <div className="divide-y divide-line">
            {TYPE.map(([token, label, cls, sample]) => (
              <div
                key={token}
                className="grid items-baseline gap-2 py-4 md:grid-cols-[140px_minmax(0,1fr)] md:gap-8"
              >
                <span className="font-mono text-xs text-chrome-500">{label}</span>
                <p
                  className={cn(
                    cls,
                    "text-chrome-100",
                    cls.includes("display") && "tracking-[var(--tracking-display)]",
                  )}
                  style={{
                    fontSize: `var(${token})`,
                    lineHeight: cls.includes("display") ? 1.1 : 1.45,
                  }}
                >
                  {sample}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="space"
          n={3}
          title="Space, radius, glow"
          lede="A 4px grid. Three radii: 4 for chips and code, 8 for controls, 14 for surfaces. Elevation is light: a 12% red glow marks focus and the active element."
        >
          <div className="grid gap-12 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <div className="grid gap-2">
              {[1, 2, 3, 4, 6, 8, 12, 16, 24].map((n) => (
                <div key={n} className="grid grid-cols-[72px_1fr] items-center gap-4">
                  <span className="font-mono text-xs text-chrome-500">space-{n}</span>
                  <span className="flex items-center gap-3">
                    <span className="h-2 bg-chrome-500" style={{ width: `var(--space-${n})` }} />
                    <span className="font-mono text-xs text-chrome-500">{n * 4}px</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="grid content-start gap-6">
              <div className="flex gap-4">
                {(
                  [
                    ["sm", 4, "rounded-sm"],
                    ["md", 8, "rounded-md"],
                    ["lg", 14, "rounded-lg"],
                  ] as const
                ).map(([k, v, r]) => (
                  <div key={k} className="grid gap-2">
                    <span className={`size-16 border border-chrome-500 bg-ink-800 ${r}`} />
                    <span className="font-mono text-xs text-chrome-500">
                      radius-{k} · {v}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4">
                <div className="grid gap-2">
                  <span className="size-16 rounded-md border border-line bg-ink-900 shadow-glow" />
                  <span className="font-mono text-xs text-chrome-500">glow-red</span>
                </div>
                <div className="grid gap-2">
                  <span className="size-16 rounded-md border border-line bg-ink-900 shadow-glow-soft" />
                  <span className="font-mono text-xs text-chrome-500">glow-red-soft</span>
                </div>
                <div className="grid gap-2">
                  <span className="size-16 rounded-md border border-line bg-ink-900 shadow-chrome" />
                  <span className="font-mono text-xs text-chrome-500">glow-chrome</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="motion"
          n={4}
          title="Motion"
          lede="Two easings, four durations. Every animation reports a state change: something entered, something is working, something was replaced. Nothing bounces for its own sake."
        >
          <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="grid grid-cols-2 gap-6">
              <EaseCurve
                name="Out expo"
                token="cubic-bezier(0.16, 1, 0.3, 1)"
                d="M0 100 C16 0 30 0 100 0"
              />
              <EaseCurve
                name="In-out quart"
                token="cubic-bezier(0.76, 0, 0.24, 1)"
                d="M0 100 C76 100 24 0 100 0"
              />
            </div>
            <div className="grid content-start gap-3">
              {[
                ["--dur-1", "120ms", "Hover, press", 120],
                ["--dur-2", "240ms", "Toggle, tab, tooltip", 240],
                ["--dur-3", "480ms", "Enter, exit, toast", 480],
                ["--dur-4", "900ms", "Scan sweep, dissolve", 900],
              ].map(([t, ms, use, w]) => (
                <div key={t as string} className="grid grid-cols-[72px_1fr] items-center gap-4">
                  <span className="font-mono text-xs text-chrome-500">{ms}</span>
                  <div>
                    <span
                      className="block h-1.5 rounded-sm bg-chrome-300"
                      style={{ width: `${((w as number) / 900) * 100}%` }}
                    />
                    <span className="mt-1 block text-xs text-chrome-500">{use}</span>
                  </div>
                </div>
              ))}
              {reduce && (
                <p className="mt-2 text-xs text-inferred">
                  Reduced motion is on: durations are 0 and the primitives below render their end
                  state.
                </p>
              )}
            </div>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
            <div className="bg-ink-900 p-6">
              <h3 className="text-sm font-semibold text-chrome-100">ScanLine</h3>
              <p className="mt-1 text-xs text-chrome-500">
                Runs only while analysis is in progress.
              </p>
              <div className="relative mt-5 h-44 overflow-hidden rounded-md border border-line bg-ink-950 p-4 font-mono text-xs leading-6 text-chrome-500">
                <ScanLine active={scanning} />
                <p>GET https://stripe.com/ 200 · 38 KB</p>
                <p>server: nginx · x-frame-options: SAMEORIGIN</p>
                <p>script /assets/vendor-3f2a.js · 214 KB</p>
                <p>link rel=preload · Söhne-Buch.woff2</p>
                <p>{scanning ? "Analysing response…" : "Idle. Start a scan to sweep."}</p>
              </div>
              <Button
                className="mt-4"
                size="sm"
                variant="ghost"
                icon={<ScanSearch strokeWidth={1.5} />}
                onClick={() => setScanning((s) => !s)}
                aria-pressed={scanning}
              >
                {scanning ? "Stop scan" : "Start scan"}
              </Button>
            </div>
            <div className="bg-ink-900 p-6">
              <h3 className="text-sm font-semibold text-chrome-100">PixelDissolve</h3>
              <p className="mt-1 text-xs text-chrome-500">
                The logo&apos;s pixel motif, for content being replaced.
              </p>
              <PixelDissolve
                show={resolved}
                className="mt-5 h-44 rounded-md border border-line bg-ink-950"
                label="Result preview"
              >
                <div className="grid h-44 content-center gap-2 p-5">
                  <Badge level="detected">Next.js 16</Badge>
                  <p className="text-sm text-chrome-100">
                    App Router, React Server Components, Turbopack build.
                  </p>
                  <p className="font-mono text-xs text-chrome-500">
                    from /_next/static/chunks/app/layout-*.js
                  </p>
                </div>
              </PixelDissolve>
              <Button
                className="mt-4"
                size="sm"
                variant="ghost"
                onClick={() => setResolved((r) => !r)}
              >
                {resolved ? "Clear result" : "Resolve result"}
              </Button>
            </div>
            <div className="bg-ink-900 p-6">
              <h3 className="text-sm font-semibold text-chrome-100">Reveal</h3>
              <p className="mt-1 text-xs text-chrome-500">
                Scroll-linked, staggered. Content is readable before it moves.
              </p>
              <Reveal stagger className="mt-5 grid gap-2">
                {[
                  "Fetch and render",
                  "Fingerprint stack",
                  "Measure Core Web Vitals",
                  "Write findings with evidence",
                ].map((t, i) => (
                  <div
                    key={t}
                    className="flex items-center gap-3 rounded-sm border border-line bg-ink-950 px-3 py-2 text-sm text-chrome-300"
                  >
                    <span className="font-mono text-xs text-chrome-500">{i + 1}</span>
                    {t}
                  </div>
                ))}
              </Reveal>
            </div>
            <div className="bg-ink-900 p-6">
              <h3 className="text-sm font-semibold text-chrome-100">MagneticButton and cursor</h3>
              <p className="mt-1 text-xs text-chrome-500">
                The primary action leans toward the pointer. The ring shows what a target does:
                action, text, copy, disabled.
              </p>
              <div className="mt-5 flex h-44 flex-wrap items-center justify-center gap-4 rounded-md border border-line bg-ink-950">
                <MagneticButton size="lg" iconRight={<ArrowRight strokeWidth={1.5} />}>
                  Analyse site
                </MagneticButton>
                <span
                  data-cursor="copy"
                  className="rounded-sm border border-line px-3 py-2 font-mono text-xs text-chrome-300"
                >
                  copy target
                </span>
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="button"
          n={5}
          title="Button"
          lede="Primary is the one red action in view. Ghost for secondary actions. Danger for destructive ones, red text until you commit."
        >
          <div className="grid gap-8 rounded-lg border border-line p-6 md:grid-cols-3">
            <State label="Default">
              <Button icon={<ScanSearch strokeWidth={1.5} />}>Analyse</Button>
              <Button variant="ghost" icon={<Download strokeWidth={1.5} />}>
                Export
              </Button>
              <Button variant="danger" icon={<Trash2 strokeWidth={1.5} />}>
                Delete scan
              </Button>
            </State>
            <State label="Hover (forced)">
              <Button className="bg-[#ff3b3b] shadow-glow-soft">Analyse</Button>
              <Button variant="ghost" className="border-chrome-500 bg-ink-800">
                Export
              </Button>
              <Button variant="danger" className="border-red-500 bg-red-900/40">
                Delete scan
              </Button>
            </State>
            <State label="Focus (forced)">
              <Button className="shadow-glow">Analyse</Button>
              <Button variant="ghost" className="shadow-glow">
                Export
              </Button>
              <Button variant="danger" className="shadow-glow">
                Delete scan
              </Button>
            </State>
            <State label="Disabled">
              <Button disabled>Analyse</Button>
              <Button variant="ghost" disabled>
                Export
              </Button>
              <Button variant="danger" disabled>
                Delete scan
              </Button>
            </State>
            <State label="Loading">
              <Button loading loadingLabel="Scanning">
                Analyse
              </Button>
              <Button variant="ghost" loading loadingLabel="Exporting">
                Export
              </Button>
            </State>
            <State label="Skeleton">
              <ButtonSkeleton width={112} />
              <ButtonSkeleton width={96} />
            </State>
            <State label="Sizes" className="md:col-span-3">
              <Button size="sm">Fix headers</Button>
              <Button size="md">Fix headers</Button>
              <Button size="lg">Fix headers</Button>
            </State>
          </div>
        </Section>

        <Section
          id="input"
          n={6}
          title="Input"
          lede="URLs, hosts and selectors are typed in mono so every character is unambiguous. Errors say what to do, not what went wrong."
        >
          <div className="grid gap-8 md:grid-cols-2">
            <Input
              label="Site to analyse"
              mono
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={urlError}
              hint="Public pages only. We fetch it once and keep the evidence."
            />
            <Input
              label="Focused (forced)"
              mono
              defaultValue="https://linear.app"
              className="[&>div]:border-red-500 [&>div]:shadow-glow-soft"
            />
            <Input
              label="Error"
              mono
              defaultValue="stripe"
              error="Enter a full URL, including https://"
            />
            <Input
              label="Checking"
              mono
              defaultValue="https://vercel.com"
              loading
              hint="Resolving DNS and following redirects"
            />
            <Input
              label="Disabled"
              mono
              defaultValue="https://github.com"
              disabled
              hint="Another scan is running on this workspace"
            />
            <InputSkeleton />
          </div>
        </Section>

        <Section
          id="badge"
          n={7}
          title="Badge"
          lede="Three words carry the weight of every finding. Detected: seen in the response. Inferred: deduced, verify before acting. Risk: a problem with a fix."
        >
          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <State label="Levels">
              <Badge level="detected" />
              <Badge level="inferred" />
              <Badge level="risk" />
            </State>
            <State label="With subject">
              <Badge level="detected">React 19</Badge>
              <Badge level="inferred">Tailwind (likely)</Badge>
              <Badge level="risk">No CSP header</Badge>
              <BadgeSkeleton />
            </State>
          </div>
        </Section>

        <Section
          id="card"
          n={8}
          title="Card"
          lede="Surfaces for findings and results. Interactive cards take focus and lift their border; the selected one carries a red edge."
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)]">
            <Card
              eyebrow="Performance"
              title="Hero image blocks LCP"
              footer="Evidence: network waterfall, request #14"
              interactive
            >
              <span className="mb-3 flex gap-2">
                <Badge level="risk" />
              </span>
              412 KB JPEG, discovered late, no preload or fetchpriority. Serving AVIF at 1600w would
              cut it to about 90 KB.
            </Card>
            <Card
              eyebrow="Stack"
              title="Vercel edge"
              selected
              footer="Evidence: x-vercel-id header"
            >
              Responses carry x-vercel-cache: HIT from the bom1 region.
            </Card>
            <div className="grid gap-4">
              <Card eyebrow="Disabled" disabled>
                Re-scan unavailable while the current scan runs.
              </Card>
              <CardSkeleton />
            </div>
          </div>
        </Section>

        <Section
          id="tabs"
          n={9}
          title="Tabs"
          lede="Arrow keys move between tabs, Home and End jump, disabled tabs are skipped. The red bar travels to the active tab."
        >
          <div className="grid gap-10 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Tabs
              label="Report sections"
              items={[
                {
                  id: "stack",
                  label: "Stack",
                  count: 12,
                  content: (
                    <p className="text-sm text-chrome-300">
                      Next.js 16 on Vercel, React 19, Inter served from Google Fonts, Segment for
                      analytics.
                    </p>
                  ),
                },
                {
                  id: "perf",
                  label: "Performance",
                  count: 4,
                  content: (
                    <p className="text-sm text-chrome-300">
                      LCP 3.1 s on a throttled mobile profile. Two render-blocking stylesheets, 214
                      KB of unused JavaScript.
                    </p>
                  ),
                },
                {
                  id: "sec",
                  label: "Security",
                  count: 3,
                  content: (
                    <p className="text-sm text-chrome-300">
                      HSTS present. Missing Content-Security-Policy and Permissions-Policy.
                    </p>
                  ),
                },
                { id: "a11y", label: "Accessibility", disabled: true, content: null },
              ]}
            />
            <Tabs label="Loading" loading items={[]} />
          </div>
        </Section>

        <Section
          id="code"
          n={10}
          title="CodeBlock"
          lede="Mono, line numbers, highlighted evidence lines and a copy button that reports success or a blocked clipboard."
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <CodeBlock
              title="next.config.ts"
              language="ts"
              code={CSS_SAMPLE}
              highlight={[3, 4, 5]}
            />
            <CodeBlock title="Loading" code="" loading />
          </div>
        </Section>

        <Section
          id="tooltip"
          n={11}
          title="Tooltip"
          lede="Opens on hover after 250ms and immediately on keyboard focus. Escape closes it. Short, factual, never the only place information lives."
        >
          <div className="flex flex-wrap items-center gap-6">
            <Tooltip content="Measured on a throttled Moto G Power profile">
              <Button variant="ghost" size="sm" icon={<Gauge strokeWidth={1.5} />}>
                LCP 3.1 s
              </Button>
            </Tooltip>
            <Tooltip content="Generates a next.config.ts headers() block" side="bottom">
              <Button variant="ghost" size="sm" icon={<Wrench strokeWidth={1.5} />}>
                Fix headers
              </Button>
            </Tooltip>
            <Tooltip content="Content-Security-Policy is missing on every HTML response">
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-sm text-red-500 hover:bg-ink-800"
                aria-label="Security risk details"
              >
                <ShieldAlert strokeWidth={1.5} className="size-4" aria-hidden />
              </button>
            </Tooltip>
          </div>
        </Section>

        <Section
          id="meter"
          n={12}
          title="ConfidenceMeter"
          lede="0 to 100. 80 and above is detected, 40 to 79 inferred, below 40 not safe to act on. The ticks mark those thresholds."
        >
          <div className="grid gap-8 md:grid-cols-2">
            <div className="grid gap-6">
              <ConfidenceMeter value={meter} label="Framework: Next.js" />
              <ConfidenceMeter value={58} label="CSS: Tailwind" />
              <ConfidenceMeter value={22} label="Hosting: AWS" />
            </div>
            <div className="grid gap-6">
              <label className="grid gap-2 text-sm text-chrome-300">
                Live value: <span className="font-mono">{meter}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={meter}
                  onChange={(e) => setMeter(Number(e.target.value))}
                  className="accent-[var(--red-500)]"
                />
              </label>
              <ConfidenceMeter value={70} label="Disabled" disabled />
              <ConfidenceMeter value={0} loading />
            </div>
          </div>
        </Section>

        <Section
          id="toast"
          n={13}
          title="Toast"
          lede="Bottom right, four at most, five seconds, paused on hover and focus. Risk toasts are announced assertively; the rest politely."
        >
          <div className="flex flex-wrap gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                push({
                  tone: "success",
                  title: "Scan complete",
                  description: "stripe.com · 14 findings in 21 s",
                })
              }
            >
              Success
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                push({
                  title: "Report link copied",
                  description: "Anyone with the link can view this scan.",
                })
              }
            >
              Info
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                push({
                  tone: "risk",
                  title: "Scan failed",
                  description: "The site returned 403 to our crawler.",
                  action: {
                    label: "Retry with browser",
                    onClick: () => push({ title: "Retrying with a real browser" }),
                  },
                })
              }
            >
              Risk with action
            </Button>
          </div>
        </Section>

        <Section
          id="rules"
          n={14}
          title="Rules"
          lede="What keeps RED from looking generated. These are enforced in review; DESIGN.md has the full list."
        >
          <ol className="grid gap-x-12 gap-y-4 text-sm text-chrome-300 md:grid-cols-2">
            {[
              "One red. No purple, no blue-purple gradients, no rainbow.",
              "Red means action or signal. Never decoration. Under 8% of the screen.",
              "Lucide icons only, 1.5px stroke. No emoji as icons.",
              "No stock gradients, no glassmorphism, no floating blobs.",
              "Every animation communicates a state change.",
              "Copy is precise and engineer-to-engineer. No “Welcome to…”.",
              "Everything sits on the 4px grid. Radii are 4, 8 or 14.",
              "Code, URLs and evidence are always mono.",
            ].map((r, i) => (
              <li key={r} className="grid grid-cols-[28px_1fr] gap-2 border-t border-line pt-4">
                <span className="font-mono text-xs text-chrome-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {r}
              </li>
            ))}
          </ol>
        </Section>
      </main>
    </div>
  );
}
