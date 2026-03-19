import { Button } from "@/components/ui/button";

interface CreateProjectFormActionsProps {
  onCancel: () => void;
  onCreate: () => void;
  disabled: boolean;
}

export function CreateProjectFormActions({
  onCancel,
  onCreate,
  disabled,
}: CreateProjectFormActionsProps) {
  return (
    <>
      <Button size="sm" variant="ghost" className="text-xs h-8 px-4" onClick={onCancel}>
        Cancel
      </Button>
      <Button size="sm" className="text-xs h-8 px-4" onClick={onCreate} disabled={disabled}>
        Create project
      </Button>
    </>
  );
}
