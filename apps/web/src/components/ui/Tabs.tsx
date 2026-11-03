"use client";
import { usePrefersReducedMotion } from "@/motion/useReducedMotion";
import { useId, useRef, useState, type ReactNode, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/motion/tokens";

export type TabItem = {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
  content: ReactNode;
};

/** WAI-ARIA tabs: arrow keys move, Home/End jump, disabled tabs are skipped. The red bar tracks the active tab. */
export function Tabs({
  items,
  defaultId,
  label,
  className,
  loading,
}: {
  items: TabItem[];
  defaultId?: string;
  label: string;
  className?: string;
  loading?: boolean;
}) {
  const [active, setActive] = useState(defaultId ?? items.find((t) => !t.disabled)?.id);
  const reduce = usePrefersReducedMotion();
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKey = (e: KeyboardEvent) => {
    const enabled = items.filter((t) => !t.disabled);
    const i = enabled.findIndex((t) => t.id === active);
    let next: TabItem | undefined;
    if (e.key === "ArrowRight") next = enabled[(i + 1) % enabled.length];
    if (e.key === "ArrowLeft") next = enabled[(i - 1 + enabled.length) % enabled.length];
    if (e.key === "Home") next = enabled[0];
    if (e.key === "End") next = enabled[enabled.length - 1];
    if (next) {
      e.preventDefault();
      setActive(next.id);
      refs.current[next.id]?.focus();
    }
  };

  if (loading)
    return (
      <div aria-hidden className={cn("grid gap-4", className)}>
        <div className="flex gap-6 border-b border-line pb-3">
          {[64, 88, 72].map((w) => (
            <span key={w} className="skeleton h-4" style={{ width: w }} />
          ))}
        </div>
        <span className="skeleton h-20 w-full" />
      </div>
    );

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKey}
        className="relative flex gap-6 border-b border-line"
      >
        {items.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              role="tab"
              id={`${base}-tab-${t.id}`}
              aria-selected={on}
              aria-controls={`${base}-panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              disabled={t.disabled}
              onClick={() => setActive(t.id)}
              className={cn(
                "relative -mb-px flex h-10 items-center gap-2 text-sm transition-colors duration-[var(--dur-1)] focus-visible:shadow-none focus-visible:after:absolute focus-visible:after:inset-x-[-6px] focus-visible:after:inset-y-1 focus-visible:after:rounded-sm focus-visible:after:shadow-glow disabled:cursor-not-allowed disabled:text-chrome-500/50",
                on ? "text-chrome-100" : "text-chrome-500 hover:text-chrome-300",
              )}
            >
              {t.label}
              {t.count != null && (
                <span className="rounded-sm bg-ink-800 px-1.5 font-mono text-xs text-chrome-300">
                  {t.count}
                </span>
              )}
              {on && (
                <motion.span
                  layoutId={`${base}-bar`}
                  className="absolute inset-x-0 bottom-0 h-px bg-red-500"
                  transition={
                    reduce ? { duration: 0 } : { duration: dur.state, ease: ease.outExpo }
                  }
                />
              )}
            </button>
          );
        })}
      </div>
      {items.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={t.id !== active}
          tabIndex={0}
          className="pt-5 focus-visible:shadow-none"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
