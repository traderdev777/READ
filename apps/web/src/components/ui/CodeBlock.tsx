"use client";
import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { cn } from "@/lib/cn";

type CodeBlockProps = {
  code: string;
  /** File name or language shown in the header, e.g. "next.config.ts". */
  title?: string;
  language?: string;
  /** 1-based line numbers to mark as evidence. */
  highlight?: number[];
  className?: string;
  loading?: boolean;
};

type CopyState = "idle" | "copied" | "failed";

export function CodeBlock({
  code,
  title,
  language,
  highlight = [],
  className,
  loading,
}: CodeBlockProps) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(t);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  if (loading)
    return (
      <div aria-hidden className={cn("rounded-lg border border-line bg-ink-900 p-4", className)}>
        {[90, 70, 82, 40].map((w, i) => (
          <span key={i} className="skeleton mb-2 block h-3.5" style={{ width: `${w}%` }} />
        ))}
      </div>
    );

  const lines = code.replace(/\n$/, "").split("\n");
  const Icon = state === "copied" ? Check : state === "failed" ? X : Copy;
  return (
    <figure className={cn("overflow-hidden rounded-lg border border-line bg-ink-900", className)}>
      <figcaption className="flex h-10 items-center justify-between border-b border-line pl-4 pr-1.5">
        <span className="truncate font-mono text-xs text-chrome-500">
          {title}
          {language && <span className="ml-2 text-chrome-500">{language}</span>}
        </span>
        <button
          type="button"
          onClick={copy}
          data-cursor="copy"
          aria-label={
            state === "copied"
              ? "Copied to clipboard"
              : state === "failed"
                ? "Copy failed"
                : `Copy ${title ?? "code"}`
          }
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-sm px-2 font-mono text-xs transition-colors duration-[var(--dur-1)] hover:bg-ink-800 focus-visible:shadow-glow",
            state === "copied"
              ? "text-detected"
              : state === "failed"
                ? "text-red-500"
                : "text-chrome-300",
          )}
        >
          <Icon aria-hidden strokeWidth={1.5} className="size-3.5" />
          {state === "copied" ? "Copied" : state === "failed" ? "Blocked" : "Copy"}
        </button>
        <span className="sr-only" aria-live="polite">
          {state === "copied"
            ? "Copied to clipboard"
            : state === "failed"
              ? "Clipboard access was blocked"
              : ""}
        </span>
      </figcaption>
      <pre
        tabIndex={0}
        className="overflow-x-auto py-3 font-mono text-[13px] leading-6 focus-visible:shadow-none"
        aria-label={title ? `${title} source` : "Code"}
      >
        <code>
          {lines.map((l, i) => {
            const marked = highlight.includes(i + 1);
            return (
              <span
                key={i}
                className={cn("grid grid-cols-[3rem_1fr] pr-4", marked && "bg-red-900/30")}
              >
                <span
                  aria-hidden
                  className={cn(
                    "select-none pr-4 text-right",
                    marked ? "text-red-500" : "text-chrome-500",
                  )}
                >
                  {i + 1}
                </span>
                <span className="whitespace-pre text-chrome-100">{l || " "}</span>
              </span>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}
