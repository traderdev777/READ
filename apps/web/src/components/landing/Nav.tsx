"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

const LINKS = [
  ["How it works", "#how"],
  ["Evidence", "#evidence"],
  ["Actions", "#actions"],
  ["Pricing", "#pricing"],
] as const;

/** Sticky nav. Compacts after 24px of scroll to say "you've left the top". */
export function Nav() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const on = () => setCompact(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-md transition-[height,background-color,border-color] duration-[var(--dur-2)] ease-[var(--ease-out-expo)]",
        compact ? "h-14 border-line bg-ink-950/85" : "h-20 border-transparent bg-ink-950/60",
      )}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex h-full max-w-[1320px] items-center gap-8 px-5 md:px-10"
      >
        <Link href="/" aria-label="RED home" className="shrink-0 rounded-sm">
          <Logo height={compact ? 22 : 28} title="" />
        </Link>
        <ul className="hidden flex-1 items-center gap-7 md:flex">
          {LINKS.map(([label, href]) => (
            <li key={href}>
              <a
                href={href}
                className="rounded-sm text-sm text-chrome-300 transition-colors duration-[var(--dur-1)] hover:text-chrome-100"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="#scan"
          className={cn(
            "ml-auto inline-flex items-center rounded-md border border-red-500 bg-red-500 px-4 font-medium text-ink-950 transition-[height,background-color,box-shadow] duration-[var(--dur-2)] ease-[var(--ease-out-expo)] hover:bg-[#ff3b3b] hover:shadow-glow-soft focus-visible:shadow-glow md:ml-0",
            compact ? "h-8 text-sm" : "h-10 text-sm",
          )}
        >
          Scan a site
        </a>
      </nav>
    </header>
  );
}
