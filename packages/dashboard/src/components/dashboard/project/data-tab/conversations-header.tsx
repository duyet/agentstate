"use client";

import { SlidersHorizontal } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface ConversationsHeaderProps {
  totalConvs: number;
  showColPicker: boolean;
  onToggleColPicker: () => void;
}

export function ConversationsHeader({
  totalConvs,
  showColPicker,
  onToggleColPicker,
}: ConversationsHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-[var(--radius-lg)] border border-edge bg-panel px-3 py-2">
      <div>
        <p className="text-[13px] font-medium text-fg">Conversation data</p>
        <p className="num font-mono text-[11px] text-fg-4">
          {totalConvs} conversation{totalConvs !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="relative">
        <Button
          variant="secondary"
          type="button"
          onClick={onToggleColPicker}
          aria-expanded={showColPicker}
          aria-haspopup="menu"
        >
          <SlidersHorizontal size={16} aria-hidden />
          Columns
        </Button>
      </div>
    </div>
  );
}
