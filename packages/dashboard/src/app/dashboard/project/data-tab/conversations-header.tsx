import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
      <div>
        <p className="text-sm font-medium">Conversation data</p>
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
        className="bg-background"
        type="button"
        onClick={onToggle}
        aria-expanded={show}
        aria-haspopup="menu"
      >
        <SlidersHorizontalIcon data-icon="inline-start" aria-hidden="true" />
        Columns
      </Button>
    </div>
  );
}
