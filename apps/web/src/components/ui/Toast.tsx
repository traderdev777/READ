"use client";
import { usePrefersReducedMotion } from "@/motion/useReducedMotion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { dur, ease } from "@/motion/tokens";

export type ToastTone = "info" | "success" | "risk";
export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
  duration?: number;
};
type ToastItem = ToastInput & { id: number };

const Ctx = createContext<{
  push: (t: ToastInput) => number;
  dismiss: (id: number) => void;
} | null>(null);

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used inside <ToastProvider>");
  return c;
}

const TONE: Record<ToastTone, { Icon: typeof Info; cls: string }> = {
  info: { Icon: Info, cls: "text-chrome-300" },
  success: { Icon: CircleCheck, cls: "text-detected" },
  risk: { Icon: TriangleAlert, cls: "text-red-500" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback((t: ToastInput) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-3), { ...t, id }]);
    return id;
  }, []);
  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <ol
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-6 right-6 z-[90] flex w-[min(380px,calc(100vw-3rem))] flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <ToastView key={t.id} t={t} onClose={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </ol>
    </Ctx.Provider>
  );
}

function ToastView({ t, onClose }: { t: ToastItem; onClose: () => void }) {
  const reduce = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);
  const tone = TONE[t.tone ?? "info"];
  useEffect(() => {
    if (paused || t.duration === Infinity) return;
    const timer = setTimeout(onClose, t.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [paused, t.duration, onClose]);
  return (
    <motion.li
      layout={!reduce}
      role={t.tone === "risk" ? "alert" : "status"}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        reduce
          ? { opacity: 0, transition: { duration: 0 } }
          : { opacity: 0, x: 24, transition: { duration: dur.state, ease: ease.inOutQuart } }
      }
      transition={{ duration: dur.enter, ease: ease.outExpo }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto relative flex gap-3 rounded-md border bg-ink-800 p-3.5 pr-10",
        t.tone === "risk" ? "border-red-500/50" : "border-line",
      )}
    >
      <tone.Icon aria-hidden strokeWidth={1.5} className={cn("mt-0.5 size-4 shrink-0", tone.cls)} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-chrome-100">{t.title}</p>
        {t.description && <p className="mt-0.5 text-xs text-chrome-300">{t.description}</p>}
        {t.action && (
          <button
            type="button"
            onClick={() => {
              t.action!.onClick();
              onClose();
            }}
            className="mt-2 font-mono text-xs uppercase tracking-wider text-red-500 hover:text-chrome-100 focus-visible:shadow-glow"
          >
            {t.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-sm text-chrome-500 hover:bg-ink-900 hover:text-chrome-100 focus-visible:shadow-glow"
      >
        <X aria-hidden strokeWidth={1.5} className="size-4" />
      </button>
    </motion.li>
  );
}
