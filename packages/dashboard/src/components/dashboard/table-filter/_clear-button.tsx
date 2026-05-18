"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClearButtonProps {
  onClear: () => void;
  disabled?: boolean;
}

export function ClearButton({ onClear, disabled }: ClearButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClear}
      disabled={disabled}
      aria-label="Clear filters"
    >
      <XIcon aria-hidden="true" />
    </Button>
  );
}
