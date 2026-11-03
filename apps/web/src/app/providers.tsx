"use client";
import { MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/ui/Toast";
import { Cursor } from "@/motion/Cursor";
import { usePrefersReducedMotion } from "@/motion/useReducedMotion";

export function Providers({ children }: { children: React.ReactNode }) {
  const reduce = usePrefersReducedMotion();
  return (
    <MotionConfig reducedMotion={reduce ? "always" : "never"}>
      <ToastProvider>
        {children}
        <Cursor />
      </ToastProvider>
    </MotionConfig>
  );
}
