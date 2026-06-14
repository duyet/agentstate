"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { Input } from "@cloudflare/kumo";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  disabled,
}: SearchInputProps) {
  return (
    <div className="relative max-w-md flex-1">
      <MagnifyingGlass
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8"
        disabled={disabled}
        aria-label="Search"
      />
    </div>
  );
}
