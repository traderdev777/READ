import { CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";
import type { ConfidenceLevel } from "@red/shared";
import { cn } from "@/lib/cn";

const META: Record<
  ConfidenceLevel,
  { label: string; cls: string; Icon: typeof CircleCheck; title: string }
> = {
  detected: {
    label: "Detected",
    cls: "text-detected border-detected/30 bg-detected/10",
    Icon: CircleCheck,
    title: "Observed directly in the response, DOM or network",
  },
  inferred: {
    label: "Inferred",
    cls: "text-inferred border-inferred/30 bg-inferred/10",
    Icon: CircleDashed,
    title: "Deduced from indirect signals; verify before acting",
  },
  risk: {
    label: "Risk",
    cls: "text-risk border-risk/40 bg-risk/10",
    Icon: TriangleAlert,
    title: "A problem with a concrete fix",
  },
};

export function Badge({
  level,
  children,
  className,
}: {
  level: ConfidenceLevel;
  children?: React.ReactNode;
  className?: string;
}) {
  const m = META[level];
  return (
    <span
      title={m.title}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-sm border px-2 font-mono text-xs uppercase tracking-wide",
        m.cls,
        className,
      )}
    >
      <m.Icon aria-hidden strokeWidth={1.5} className="size-3.5" />
      {children ?? m.label}
    </span>
  );
}

export function BadgeSkeleton() {
  return <span aria-hidden className="skeleton inline-block h-6 w-24 rounded-sm" />;
}
