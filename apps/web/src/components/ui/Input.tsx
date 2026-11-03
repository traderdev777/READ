"use client";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Globe, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  /** Hide the label visually but keep it for screen readers. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  loading?: boolean;
  /** Mono text and a globe glyph: use for URLs, hosts, selectors and anything copied from code. */
  mono?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hideLabel,
    hint,
    error,
    loading,
    mono,
    leading,
    trailing,
    className,
    id,
    disabled,
    ...props
  },
  ref,
) {
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = `${inputId}-hint`;
  const lead = leading ?? (mono ? <Globe aria-hidden strokeWidth={1.5} /> : null);
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label
        htmlFor={inputId}
        className={cn("text-sm font-medium text-chrome-300", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <div
        className={cn(
          "group flex h-12 items-center gap-2 rounded-md border bg-ink-900 px-3 transition-[border-color,box-shadow] duration-[var(--dur-1)] ease-[var(--ease-out-expo)] [&_svg]:size-4 [&_svg]:shrink-0",
          error ? "border-red-500" : "border-line hover:border-chrome-500",
          "focus-within:border-red-500 focus-within:shadow-glow-soft",
          disabled && "pointer-events-none opacity-40",
        )}
      >
        {lead && <span className="text-chrome-500 group-focus-within:text-chrome-300">{lead}</span>}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? hintId : undefined}
          aria-busy={loading || undefined}
          spellCheck={mono ? false : undefined}
          autoCapitalize={mono ? "off" : undefined}
          autoCorrect={mono ? "off" : undefined}
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent text-chrome-100 placeholder:text-chrome-500 focus:outline-none focus-visible:shadow-none",
            mono ? "font-mono text-sm" : "text-base",
          )}
          {...props}
        />
        {loading ? (
          <Loader2
            aria-label="Checking"
            strokeWidth={1.5}
            className="animate-spin text-chrome-500 motion-reduce:animate-none"
          />
        ) : (
          trailing
        )}
      </div>
      {(error || hint) && (
        <p
          id={hintId}
          className={cn(
            "flex items-center gap-1.5 text-xs",
            error ? "text-red-500" : "text-chrome-500",
          )}
        >
          {error && <AlertTriangle aria-hidden strokeWidth={1.5} className="size-3.5" />}
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

export function InputSkeleton() {
  return (
    <div aria-hidden className="grid gap-1.5">
      <span className="skeleton h-3.5 w-24" />
      <span className="skeleton h-12 w-full rounded-md" />
    </div>
  );
}
