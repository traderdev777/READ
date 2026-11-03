"use client";
import { usePrefersReducedMotion } from "@/motion/useReducedMotion";
import { motion } from "framer-motion";
import type { ConfidenceLevel } from "@red/shared";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/motion/tokens";

/** Thresholds: 80+ is observed directly, 40–79 is inferred, below 40 is not safe to act on. */
export function levelFor(score: number): ConfidenceLevel {
  return score >= 80 ? "detected" : score >= 40 ? "inferred" : "risk";
}

const COLOR: Record<ConfidenceLevel, string> = {
  detected: "bg-detected",
  inferred: "bg-inferred",
  risk: "bg-risk",
};
const WORD: Record<ConfidenceLevel, string> = {
  detected: "Detected",
  inferred: "Inferred",
  risk: "Low confidence",
};

export function ConfidenceMeter({
  value,
  label = "Confidence",
  className,
  loading,
  disabled,
}: {
  value: number;
  label?: string;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
}) {
  const reduce = usePrefersReducedMotion();
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const level = levelFor(v);
  if (loading)
    return (
      <div aria-hidden className={cn("grid gap-2", className)}>
        <span className="skeleton h-3.5 w-28" />
        <span className="skeleton h-1.5 w-full" />
      </div>
    );
  return (
    <div aria-disabled={disabled || undefined} className={cn("grid gap-2", className)}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-chrome-300">{label}{disabled && <span className="text-chrome-500"> · paused</span>}</span>
        <span className="font-mono text-chrome-100">
          {v}
          <span className="text-chrome-500">/100 · {WORD[level]}</span>
        </span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-valuetext={`${v} out of 100, ${WORD[level]}`}
        className="relative h-1.5 overflow-hidden rounded-sm bg-ink-800"
      >
        {[40, 80].map((t) => (
          <span
            key={t}
            aria-hidden
            className="absolute inset-y-0 w-px bg-ink-950"
            style={{ left: `${t}%` }}
          />
        ))}
        <motion.span
          className={cn("absolute inset-y-0 left-0 rounded-sm", disabled ? "bg-chrome-500/40" : COLOR[level])}
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: reduce ? 0 : dur.enter, ease: ease.outExpo }}
        />
      </div>
    </div>
  );
}
