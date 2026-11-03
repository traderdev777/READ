"use client";
import { useState } from "react";
import type { ConfidenceLevel } from "@red/shared";
import { Badge } from "@/components/ui/Badge";
import { ConfidenceMeter } from "@/components/ui/ConfidenceMeter";
import { cn } from "@/lib/cn";
import { Illustration } from "./Illustration";

const FINDINGS: {
  id: string;
  level: ConfidenceLevel;
  title: string;
  score: number;
  kind: string;
  source: string;
  excerpt: string;
  why: string;
}[] = [
  {
    id: "fw",
    level: "detected",
    title: "Next.js, App Router",
    score: 96,
    kind: "script",
    source: "GET /_next/static/chunks/app/layout-8f3c1a.js",
    excerpt: '<script src="/_next/static/chunks/app/layout-8f3c1a.js" async>',
    why: "The App Router chunk path is unique to Next.js 13+.",
  },
  {
    id: "host",
    level: "detected",
    title: "Served from Vercel's edge",
    score: 92,
    kind: "header",
    source: "response header · x-vercel-id",
    excerpt: "x-vercel-id: bom1::iad1::7mxz2-1730632051-9b1e",
    why: "Vercel sets this header on every edge response.",
  },
  {
    id: "css",
    level: "inferred",
    title: "Tailwind CSS",
    score: 62,
    kind: "dom",
    source: "class attributes · 1,284 elements",
    excerpt: 'class="flex items-center gap-3 px-4 py-2 text-sm"',
    why: "Utility class names match Tailwind's scale, but the stylesheet is compiled, so the build tool itself isn't visible.",
  },
  {
    id: "csp",
    level: "risk",
    title: "No Content-Security-Policy",
    score: 88,
    kind: "header",
    source: "response headers · document",
    excerpt: "content-security-policy: (absent)",
    why: "Without a CSP, an injected script runs with full page access. Fix: add a headers() rule.",
  },
];

/**
 * A finding card that reveals the evidence behind each line on hover or focus.
 * Built with the real Badge and ConfidenceMeter.
 */
export function EvidenceCard() {
  const [active, setActive] = useState(FINDINGS[0]!.id);
  const f = FINDINGS.find((x) => x.id === active)!;
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-ink-900">
      <div className="flex h-10 items-center justify-between border-b border-line px-4">
        <span className="font-mono text-xs text-chrome-500">findings · 4 of 14</span>
        <Illustration />
      </div>
      <ul aria-label="Findings" className="divide-y divide-line">
        {FINDINGS.map((x) => (
          <li key={x.id}>
            <button
              type="button"
              aria-pressed={x.id === active}
              onPointerEnter={() => setActive(x.id)}
              onFocus={() => setActive(x.id)}
              onClick={() => setActive(x.id)}
              className={cn(
                "flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-[var(--dur-1)] focus-visible:shadow-none focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-red-500",
                x.id === active ? "bg-ink-800" : "hover:bg-ink-800/60",
              )}
            >
              <span className="text-sm text-chrome-100">{x.title}</span>
              <Badge level={x.level} />
            </button>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 border-t border-line bg-ink-950 p-4" aria-live="polite">
        <ConfidenceMeter value={f.score} label={`Confidence · ${f.title}`} />
        <div className="grid gap-1.5">
          <p className="font-mono text-xs uppercase tracking-wider text-chrome-500">
            Evidence · {f.kind}
          </p>
          <p className="font-mono text-xs text-chrome-300">{f.source}</p>
          <pre className="overflow-x-auto rounded-sm border border-line bg-ink-900 px-3 py-2 font-mono text-xs text-chrome-100">
            {f.excerpt}
          </pre>
        </div>
        <p className="text-sm text-chrome-300">{f.why}</p>
      </div>
    </div>
  );
}
