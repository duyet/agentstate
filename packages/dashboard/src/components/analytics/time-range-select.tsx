"use client";

import { cn } from "@/lib/utils";

const RANGES = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
] as const;

export type TimeRange = (typeof RANGES)[number]["value"];

interface TimeRangeSelectProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeSelect({ value, onChange }: TimeRangeSelectProps) {
  return (
    <fieldset className="flex overflow-hidden rounded-lg border border-border">
      <legend className="sr-only">Select time range</legend>
      {RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          aria-pressed={value === r.value}
          onClick={() => onChange(r.value)}
          className={cn(
            "px-3 py-[7px] font-mono text-xs transition-colors",
            value === r.value
              ? "bg-foreground text-background"
              : "bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </button>
      ))}
    </fieldset>
  );
}
