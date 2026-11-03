import { cn } from "@/lib/cn";

/** Marks a product visual as an illustration, not live output. Required on every mock-up. */
export function Illustration({ className, note }: { className?: string; note?: string }) {
  return (
    <span
      className={cn("font-mono text-[11px] uppercase tracking-wider text-chrome-500", className)}
    >
      Illustration{note ? ` · ${note}` : ""}
    </span>
  );
}
