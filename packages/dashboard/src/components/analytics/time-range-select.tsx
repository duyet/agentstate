"use client";

import { Button } from "@/components/ui/button";

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
    <div className="flex gap-1 bg-muted rounded-lg p-0.5">
      {RANGES.map((r) => (
        <Button
          key={r.value}
          size="sm"
          variant={value === r.value ? "default" : "ghost"}
          className="h-7 px-3 text-xs"
          onClick={() => onChange(r.value)}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}
