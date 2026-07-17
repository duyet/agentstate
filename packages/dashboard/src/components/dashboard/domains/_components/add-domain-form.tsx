import { XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isValidDomain } from "@/lib/domain-validation";

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
  // Live inline validation, mirroring ProjectSlugInput's pattern: only flag
  // once the user has typed something, so an empty field isn't shown as
  // invalid before they start. Server-side failures (domain already claimed,
  // etc.) still surface via the toast in useDomainActions.
  const isInvalid = value.trim().length > 0 && !isValidDomain(value);
  const isSubmitDisabled = !value.trim() || isInvalid || adding;

  return (
    <Card className="flex flex-col gap-component card-padding-sm">
      <Input
        id="domain-input"
        label="Domain name"
        description="Enter your domain without the protocol (https://) or path."
        error={
          isInvalid
            ? "Enter a valid domain without a protocol (https://) or path, e.g. app.example.com"
            : undefined
        }
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
        <Button variant="primary" onClick={onSubmit} disabled={isSubmitDisabled} loading={adding}>
          {adding ? "Adding..." : "Add"}
        </Button>
        <Button variant="ghost" onClick={onCancel} aria-label="Cancel adding domain">
          <XIcon size={16} aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}
