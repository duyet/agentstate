"use client";

import { Button } from "@cloudflare/kumo/components/button";

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
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <Button size="sm" variant="primary" onClick={onCreate} disabled={disabled}>
        Create project
      </Button>
    </>
  );
}
