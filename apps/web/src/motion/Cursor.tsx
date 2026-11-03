"use client";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useCoarsePointer, usePrefersReducedMotion } from "./useReducedMotion";

type CursorState = "idle" | "action" | "text" | "copy" | "disabled";

const LABEL: Partial<Record<CursorState, string>> = { copy: "Copy" };

/**
 * A follower ring that mirrors what the element under the pointer will do.
 * The native cursor stays visible (accessibility and precision); the ring only adds state.
 * Mark elements with data-cursor="action" | "text" | "copy". Off for touch and reduced motion.
 */
export function Cursor() {
  const reduce = usePrefersReducedMotion();
  const coarse = useCoarsePointer();
  const [state, setState] = useState<CursorState>("idle");
  const [visible, setVisible] = useState(false);
  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const x = useSpring(mx, { stiffness: 900, damping: 50, mass: 0.3 });
  const y = useSpring(my, { stiffness: 900, damping: 50, mass: 0.3 });

  useEffect(() => {
    if (reduce || coarse) return;
    const move = (e: PointerEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
      setVisible(true);
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-cursor], button, a, input, textarea, [role=tab]",
      );
      if (!t) return setState("idle");
      if (t.matches(":disabled, [aria-disabled=true]") || t.querySelector(":disabled"))
        return setState("disabled");
      const d = t.dataset.cursor as CursorState | undefined;
      if (d) return setState(d);
      setState(t.matches("input, textarea") ? "text" : "action");
    };
    const leave = () => setVisible(false);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [reduce, coarse, mx, my]);

  if (reduce || coarse) return null;
  const size = state === "action" ? 36 : state === "copy" ? 44 : state === "text" ? 4 : 20;
  const border =
    state === "action" || state === "copy"
      ? "var(--red-500)"
      : state === "disabled"
        ? "var(--line)"
        : "var(--chrome-500)";

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] mix-blend-normal"
      style={{ x, y, opacity: visible ? 1 : 0 }}
    >
      <motion.div
        className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border font-mono text-[10px] uppercase tracking-wider text-chrome-100"
        animate={{
          width: size,
          height: state === "text" ? 22 : size,
          borderRadius: state === "text" ? 2 : 999,
          borderColor: border,
          backgroundColor: state === "copy" ? "rgba(255,31,31,0.12)" : "rgba(0,0,0,0)",
        }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      >
        {LABEL[state]}
      </motion.div>
    </motion.div>
  );
}
