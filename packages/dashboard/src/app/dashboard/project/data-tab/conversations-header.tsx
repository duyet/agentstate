"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { SlidersHorizontal } from "@phosphor-icons/react";

interface ConversationsHeaderProps {
  totalConvs: number;
  showColPicker: boolean;
  onToggleColPicker: () => void;
}

interface ColumnPickerTriggerProps {
  show: boolean;
  onToggle: () => void;
}

export function ConversationsHeader({
  totalConvs,
  showColPicker,
  onToggleColPicker,
}: ConversationsHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-kumo-base px-3 py-2 shadow-sm">
      <div>
        <p className="text-sm font-medium text-foreground">Conversation data</p>
        <ConversationsCount count={totalConvs} />
      </div>
      <ColumnPickerTrigger show={showColPicker} onToggle={onToggleColPicker} />
    </div>
  );
}

function ConversationsCount({ count }: { count: number }) {
  return (
    <p className="text-xs text-muted-foreground">
      {count} conversation{count !== 1 ? "s" : ""}
    </p>
  );
}

function ColumnPickerTrigger({ show, onToggle }: ColumnPickerTriggerProps) {
  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        icon={<SlidersHorizontal aria-hidden />}
        type="button"
        onClick={onToggle}
        aria-expanded={show}
        aria-haspopup="menu"
      >
        Columns
      </Button>
    </div>
  );
}
