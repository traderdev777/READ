"use client";
import { usePrefersReducedMotion } from "@/motion/useReducedMotion";
import { useMemo, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { dur, ease } from "./tokens";

type PixelDissolveProps = {
  /** Visible state. Toggling it plays the dissolve: pixels cover, content swaps, pixels clear. */
  show: boolean;
  children: ReactNode;
  /** Grid resolution. The logo motif reads best at 6–10 columns. */
  cols?: number;
  rows?: number;
  className?: string;
  /** Accessible label for the region whose content changes. */
  label?: string;
};

/** Deterministic pseudo-random order so server and client agree. */
function order(n: number, seed = 7) {
  const out = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * The logo's pixel-square motif as a state transition: content enters by resolving out of
 * square pixels and leaves by breaking into them. Use it where content is replaced, such as
 * a raw result becoming an analysed one. Reduced motion swaps content instantly.
 */
export function PixelDissolve({
  show,
  children,
  cols = 8,
  rows = 5,
  className,
  label,
}: PixelDissolveProps) {
  const reduce = usePrefersReducedMotion();
  const cells = useMemo(() => order(cols * rows), [cols, rows]);
  const step = dur.sequence / 2 / cells.length;
  return (
    <div
      className={`relative overflow-hidden ${className ?? ""}`}
      aria-live="polite"
      aria-label={label}
    >
      <AnimatePresence mode="wait" initial={false}>
        {show && (
          <motion.div
            key="content"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: reduce ? 0 : dur.state, delay: reduce ? 0 : dur.sequence / 2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
      {!reduce && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {cells.map((rank, i) => (
            <motion.span
              key={`${show}-${i}`}
              className="block bg-red-500"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.6] }}
              transition={{
                duration: dur.sequence,
                times: [0, 0.35, 0.6, 1],
                delay: rank * step,
                ease: ease.inOutQuart,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
