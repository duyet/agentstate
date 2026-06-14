"use client";

import { XIcon } from "@phosphor-icons/react";
import { Button } from "@cloudflare/kumo/components/button";
import { Input } from "@cloudflare/kumo/components/input";
import { Surface } from "@cloudflare/kumo/components/surface";

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
    <Surface className="mb-6 flex flex-col gap-4 border-border border border-dashed p-6">
      <Input
        id="domain-input"
        label="Domain name"
        placeholder="e.g. app.example.com"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isSubmitDisabled) {
            onSubmit();
          }
        }}
        description="Enter your domain without the protocol (https://) or path."
        autoFocus
      />
      <div className="flex gap-2">
        <Button variant="primary" onClick={onSubmit} disabled={isSubmitDisabled} loading={adding}>
          {adding ? "Adding..." : "Add"}
        </Button>
        <Button
          variant="ghost"
          shape="square"
          size="sm"
          onClick={onCancel}
          aria-label="Cancel adding domain"
        >
          <XIcon aria-hidden="true" />
        </Button>
      </div>
    </Surface>
  );
}
