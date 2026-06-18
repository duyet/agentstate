"use client";

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
        <button
          key={r.value}
          type="button"
          aria-pressed={value === r.value}
          onClick={() => onChange(r.value)}
          className={`min-h-[34px] px-3 font-mono text-[12px] transition-colors ${
            value === r.value
              ? "bg-fg text-[var(--color-base)]"
              : "bg-panel text-fg-3 hover:bg-panel2 hover:text-fg"
          }`}
        >
          {r.label}
        </button>
      ))}
    </fieldset>
  );
}
