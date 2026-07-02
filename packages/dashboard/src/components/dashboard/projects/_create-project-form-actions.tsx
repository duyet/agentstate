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
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" size="sm" onClick={onCreate} disabled={disabled}>
        Create project
      </Button>
    </>
  );
}
