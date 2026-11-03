"use client";
import { MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/ui/Toast";
import dynamic from "next/dynamic";
import { usePrefersReducedMotion } from "@/motion/useReducedMotion";

// The cursor is decoration-free state feedback for fine pointers; load it after hydration.
const Cursor = dynamic(() => import("@/motion/Cursor").then((m) => m.Cursor), { ssr: false });

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
