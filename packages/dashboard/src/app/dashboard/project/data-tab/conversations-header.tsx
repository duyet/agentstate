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
    <div className="flex items-center justify-between mb-4">
      <ConversationsCount count={totalConvs} />
      <ColumnPickerTrigger show={showColPicker} onToggle={onToggleColPicker} />
    </div>
  );
}

function ConversationsCount({ count }: { count: number }) {
  return (
    <p className="text-sm text-muted-foreground">
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
