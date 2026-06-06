import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Mono uppercase eyebrow label. */
export function MonoLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("as-label", className)}>{children}</span>;
}

/** Rounded mono pill, e.g. status chips like "universal state layer". */
export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-[5px] font-mono text-[11.5px] font-medium uppercase tracking-[0.04em] text-ink-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Small mono tag chip, e.g. framework labels or HTTP methods. */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-[5px] border border-border bg-bg-deep px-[7px] py-[3px] font-mono text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Accent (vermilion) variant of Tag — used for HTTP method chips. */
export function MethodTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-[5px] border border-brand-line bg-brand-soft px-[7px] py-[3px] text-center font-mono text-[11px] font-semibold text-brand-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
