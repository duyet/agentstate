import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Optional trend chip, e.g. "+18%" (rendered in the vermilion accent). */
  delta?: string;
  /** Optional secondary line under the value. */
  description?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  description,
  className,
}: StatCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4 shadow-sm", className)}>
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        <span className="text-[13px]">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span
          suppressHydrationWarning
          className="font-display text-[26px] font-semibold tracking-[-0.02em] tabular-nums text-foreground"
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {delta && <span className="font-mono text-[11.5px] text-brand-ink">{delta}</span>}
      </div>
      {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
