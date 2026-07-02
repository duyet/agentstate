import { XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export interface AddDomainFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  adding: boolean;
}

export function _AddDomainForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  adding,
}: AddDomainFormProps) {
  const isSubmitDisabled = !value.trim() || adding;

  return (
    <Card className="flex flex-col gap-component card-padding-sm">
      <Input
        id="domain-input"
        label="Domain name"
        description="Enter your domain without the protocol (https://) or path."
        placeholder="e.g. app.example.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isSubmitDisabled) {
            onSubmit();
          }
        }}
        autoFocus
        mono
      />
      <div className="flex gap-tight">
        <Button variant="primary" onClick={onSubmit} disabled={isSubmitDisabled}>
          {adding ? "Adding..." : "Add"}
        </Button>
        <Button variant="ghost" onClick={onCancel} aria-label="Cancel adding domain">
          <XIcon size={16} aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}
