"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, keeps the width, blocks clicks and sets aria-busy. */
  loading?: boolean;
  /** Text read while loading, e.g. "Scanning". Defaults to the children. */
  loadingLabel?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
};

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium tracking-tight rounded-md border transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--dur-1)] ease-[var(--ease-out-expo)] focus-visible:shadow-glow active:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-busy:cursor-progress";

const variants: Record<ButtonVariant, string> = {
  // The one red action per view.
  primary:
    "bg-red-500 border-red-500 text-ink-950 hover:bg-[#ff3b3b] hover:shadow-glow-soft active:bg-red-600 active:border-red-600",
  ghost:
    "bg-transparent border-line text-chrome-100 hover:border-chrome-500 hover:bg-ink-800 active:bg-ink-900",
  danger:
    "bg-transparent border-red-900 text-red-500 hover:bg-red-900/40 hover:border-red-500 active:bg-red-900/60",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm [&_svg]:size-3.5",
  md: "h-10 px-4 text-sm [&_svg]:size-4",
  lg: "h-12 px-6 text-base [&_svg]:size-[18px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    loadingLabel,
    icon,
    iconRight,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Loader2
          aria-hidden
          strokeWidth={1.5}
          className="animate-spin motion-reduce:animate-none"
        />
      ) : (
        icon
      )}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
      {!loading && iconRight}
    </button>
  );
});

/** Loading placeholder with the exact footprint of a Button. */
export function ButtonSkeleton({
  size = "md",
  width = 120,
}: {
  size?: ButtonSize;
  width?: number;
}) {
  const h = size === "sm" ? "h-8" : size === "lg" ? "h-12" : "h-10";
  return (
    <span aria-hidden className={cn("skeleton inline-block rounded-md", h)} style={{ width }} />
  );
}
