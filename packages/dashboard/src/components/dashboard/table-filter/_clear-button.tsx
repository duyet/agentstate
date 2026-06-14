"use client";

import { X } from "@phosphor-icons/react";
import { Button } from "@cloudflare/kumo";

interface ClearButtonProps {
  onClear: () => void;
  disabled?: boolean;
}

export function ClearButton({ onClear, disabled }: ClearButtonProps) {
  return (
    <Button
      variant="ghost"
      shape="square"
      size="sm"
      onClick={onClear}
      disabled={disabled}
      aria-label="Clear filters"
      icon={<X aria-hidden="true" />}
    />
  );
}
