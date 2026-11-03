"use client";
import { usePrefersReducedMotion } from "@/motion/useReducedMotion";
import { cloneElement, isValidElement, useId, useRef, useState, type ReactElement } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { dur, ease } from "@/motion/tokens";

type TooltipProps = {
  content: string;
  /** A single focusable element. */
  children: ReactElement<Record<string, unknown>>;
  side?: "top" | "bottom";
  /** ms before opening on hover. Focus opens immediately. */
  delay?: number;
};

/** Opens on hover and keyboard focus, closes on Escape and blur. Linked via aria-describedby. */
export function Tooltip({ content, children, side = "top", delay = 250 }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduce = usePrefersReducedMotion();
  const show = (now = false) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), now ? 0 : delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };
  if (!isValidElement(children)) return children;
  const trigger = cloneElement(children, { "aria-describedby": open ? id : undefined });
  const y = side === "top" ? 4 : -4;
  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => show()}
      onPointerLeave={hide}
      onFocus={() => show(true)}
      onBlur={hide}
      onKeyDown={(e) => e.key === "Escape" && hide()}
    >
      {trigger}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            id={id}
            initial={reduce ? false : { opacity: 0, y }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, y, transition: { duration: dur.micro } }
            }
            transition={{ duration: dur.state, ease: ease.outExpo }}
            className={`pointer-events-none absolute left-1/2 z-50 w-max max-w-64 -translate-x-1/2 rounded-sm border border-line bg-ink-800 px-2.5 py-1.5 text-xs leading-snug text-chrome-100 shadow-chrome ${side === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
