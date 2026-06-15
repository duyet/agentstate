import { XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="domain-input" className="text-[13px] font-medium text-fg-2">
          Domain name
        </label>
        <input
          id="domain-input"
          type="text"
          placeholder="e.g. app.example.com"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSubmitDisabled) {
              onSubmit();
            }
          }}
          // biome-ignore lint/a11y/noAutofocus: intentional — focuses the domain field when the add form opens (matches prior behavior)
          autoFocus
          className="min-h-[40px] rounded-[var(--radius)] border border-edge bg-panel2 px-3 py-2 font-mono text-[13px] text-fg outline-none transition-[border-color] placeholder:text-fg-4 focus:border-accent"
        />
        <p className="text-[12px] leading-5 text-fg-4">
          Enter your domain without the protocol (https://) or path.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="primary" onClick={onSubmit} disabled={isSubmitDisabled}>
          {adding ? "Adding..." : "Add"}
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          aria-label="Cancel adding domain"
          className="min-h-[40px]"
        >
          <XIcon size={16} aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}
