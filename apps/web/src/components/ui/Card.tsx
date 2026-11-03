import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Interactive cards lift their border on hover and take focus. Use for anything that opens. */
  interactive?: boolean;
  /** Marks the card the current selection with a red edge. */
  selected?: boolean;
  disabled?: boolean;
  eyebrow?: ReactNode;
  title?: ReactNode;
  footer?: ReactNode;
};

export function Card({
  interactive,
  selected,
  disabled,
  eyebrow,
  title,
  footer,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      tabIndex={interactive && !disabled ? 0 : undefined}
      aria-disabled={disabled || undefined}
      aria-current={selected || undefined}
      data-cursor={interactive && !disabled ? "action" : undefined}
      className={cn(
        "relative rounded-lg border bg-ink-900 p-5 transition-[border-color,background-color,box-shadow] duration-[var(--dur-2)] ease-[var(--ease-out-expo)]",
        selected ? "border-red-500/70 shadow-glow-soft" : "border-line",
        interactive &&
          !disabled &&
          "cursor-pointer hover:border-chrome-500 hover:bg-ink-800 focus-visible:shadow-glow",
        disabled && "opacity-40",
        className,
      )}
      {...props}
    >
      {selected && <span aria-hidden className="absolute inset-y-4 left-0 w-px bg-red-500" />}
      {eyebrow && (
        <div className="mb-2 font-mono text-xs uppercase tracking-wider text-chrome-500">
          {eyebrow}
        </div>
      )}
      {title && (
        <h3 className="mb-2 text-lg font-semibold tracking-tight text-chrome-100">{title}</h3>
      )}
      <div className="text-sm text-chrome-300">{children}</div>
      {footer && (
        <div className="mt-4 border-t border-line pt-3 text-xs text-chrome-500">{footer}</div>
      )}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div aria-hidden className="rounded-lg border border-line bg-ink-900 p-5">
      <span className="skeleton mb-3 block h-3 w-20" />
      <span className="skeleton mb-3 block h-5 w-2/3" />
      <span className="skeleton mb-2 block h-3.5 w-full" />
      <span className="skeleton block h-3.5 w-4/5" />
    </div>
  );
}
