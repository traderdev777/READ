"use client";
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/* A manual override (used by the /system preview switch) on top of the OS preference. */
let forced = false;
const listeners = new Set<() => void>();
export function setForcedReducedMotion(on: boolean) {
  forced = on;
  document.documentElement.dataset.motion = on ? "reduce" : "";
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  listeners.add(cb);
  return () => {
    mq.removeEventListener("change", cb);
    listeners.delete(cb);
  };
}

/** True when the user asked the OS for less motion (or the preview switch is on). False on the server. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => forced || window.matchMedia(QUERY).matches,
    () => false,
  );
}

/** True for touch-first devices, where cursor and magnetic effects are off. True on the server. */
export function useCoarsePointer() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => true,
  );
}
