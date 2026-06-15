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
      <Button variant="ghost" onClick={onCancel} className="min-h-[36px] py-2">
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={onCreate}
        disabled={disabled}
        className="min-h-[36px] py-2"
      >
        Create project
      </Button>
    </>
  );
}
