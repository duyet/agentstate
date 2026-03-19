"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      {label && <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>}
      <Select
        value={value}
        onValueChange={(newValue) => {
          if (newValue !== null) {
            onChange(newValue);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger size="default" aria-label={label || "Filter"}>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
