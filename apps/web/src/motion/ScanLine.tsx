"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "./useReducedMotion";
import { dur, ease } from "./tokens";

type ScanLineProps = {
  /** True while a scan is in progress. The line stops the moment this turns false. */
  active: boolean;
  /** Seconds per sweep. Defaults to 2.4 s: slow enough to read as "working", not as an alarm. */
  period?: number;
  className?: string;
};

/**
 * A thin red line sweeping top to bottom over its parent while analysis runs.
 * Place inside a relatively positioned container. With reduced motion it becomes a
 * static red top border plus the parent's own "Analysing" text.
 */
export function ScanLine({ active, period = 2.4, className }: ScanLineProps) {
  const line = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const el = line.current;
    if (!el || reduce) return;
    const ctx = gsap.context(() => {
      if (active) {
        gsap.set(el, { autoAlpha: 1, yPercent: 0, top: 0 });
        gsap.fromTo(el, { top: "0%" }, { top: "100%", duration: period, ease: "none", repeat: -1 });
      } else {
        gsap.to(el, { autoAlpha: 0, duration: dur.state, ease: ease.gsap.outExpo });
      }
    });
    return () => ctx.revert();
  }, [active, period, reduce]);

  if (reduce)
    return active ? (
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-red-500 ${className ?? ""}`}
      />
    ) : null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      <div
        ref={line}
        className="invisible absolute inset-x-0 h-px bg-red-500"
        style={{ boxShadow: "0 0 12px 1px rgb(255 31 31 / 0.45)" }}
      >
        <div
          className="absolute inset-x-0 bottom-px h-10"
          style={{ background: "linear-gradient(to top, rgb(255 31 31 / 0.10), transparent)" }}
        />
      </div>
    </div>
  );
}
