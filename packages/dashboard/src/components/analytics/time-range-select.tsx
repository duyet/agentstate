"use client";

import { Toggle } from "@/components/ui/toggle";

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
    <fieldset className="flex overflow-hidden rounded-[var(--radius)] border border-edge">
      <legend className="sr-only">Select time range</legend>
      {RANGES.map((r) => (
        <Toggle
          key={r.value}
          variant="ghost"
          size="sm"
          pressed={value === r.value}
          onClick={() => onChange(r.value)}
          className="rounded-none font-mono"
        >
          {r.label}
        </Toggle>
      ))}
    </fieldset>
  );
}
