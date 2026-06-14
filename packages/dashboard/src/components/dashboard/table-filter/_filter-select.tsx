"use client";

import { Select } from "@cloudflare/kumo";
import type { FilterOption } from "./table-filter";

interface FilterSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  label?: string;
  disabled?: boolean;
}

export function FilterSelect({ value, onChange, options, label, disabled }: FilterSelectProps) {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="whitespace-nowrap text-sm text-muted-foreground">{label}</span>
      )}
      <Select
        value={value}
        onValueChange={(newValue) => {
          if (newValue !== null && newValue !== undefined) {
            onChange(newValue as string);
          }
        }}
        disabled={disabled}
        placeholder="Select..."
        aria-label={label || "Filter"}
        items={options.map((option) => ({ label: option.label, value: option.value }))}
      />
    </div>
  );
}
