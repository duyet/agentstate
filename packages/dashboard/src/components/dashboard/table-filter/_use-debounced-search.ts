"use client";

import { useEffect, useState } from "react";

interface UseDebouncedSearchProps {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export function useDebouncedSearch({ value, onChange, debounceMs = 300 }: UseDebouncedSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync external value to local state
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, onChange, debounceMs]);

  return { localValue, setLocalValue };
}
