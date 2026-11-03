"use client";
import { useRef, type ComponentProps } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useCoarsePointer, usePrefersReducedMotion } from "./useReducedMotion";
import { Button } from "@/components/ui/Button";

type MagneticProps = ComponentProps<typeof Button> & {
  /** 0–1: how far the button follows the pointer. 0.25 keeps it readable. */
  strength?: number;
};

/**
 * Primary call to action that leans toward the pointer to say "this is the next step".
 * Off for touch, reduced motion, disabled and loading states.
 */
export function MagneticButton({ strength = 0.25, disabled, loading, ...props }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = usePrefersReducedMotion();
  const coarse = useCoarsePointer();
  const x = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 });
  const y = useSpring(useMotionValue(0), { stiffness: 260, damping: 18, mass: 0.4 });
  const off = reduce || coarse || disabled || loading;

  const move = (e: React.PointerEvent) => {
    if (off || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.span
      ref={ref}
      className="inline-block"
      style={off ? undefined : { x, y }}
      onPointerMove={move}
      onPointerLeave={reset}
      data-cursor="action"
    >
      <Button disabled={disabled} loading={loading} {...props} />
    </motion.span>
  );
}
