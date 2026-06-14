"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { Input } from "@cloudflare/kumo/components/input";
import { Label } from "@cloudflare/kumo/components/label";
import { X } from "@phosphor-icons/react";

interface InlineFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  placeholder?: string;
  submitLabel?: string;
  submitting?: boolean;
  label?: string;
  helperText?: string;
  inputId?: string;
}

/**
 * InlineForm - Reusable inline input form with submit/cancel actions.
 * Common pattern for quick-create flows like "Add Domain", "Create API Key", etc.
 *
 * @example
 * ```tsx
 * <InlineForm
 *   value={domain}
 *   onChange={setDomain}
 *   onSubmit={handleAdd}
 *   onCancel={() => setShowForm(false)}
 *   placeholder="e.g. app.example.com"
 *   label="Domain name"
 *   helperText="Enter your domain without the protocol (https://)"
 *   submitting={adding}
 *   submitLabel="Add"
 * />
 * ```
 */
export function InlineForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = "e.g. Production",
  submitLabel = "Submit",
  submitting = false,
  label,
  helperText,
  inputId = "inline-form-input",
}: InlineFormProps) {
  const canSubmit = value.trim();
  const handleSubmit = () => {
    if (canSubmit) onSubmit();
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border border-border bg-card p-5 shadow-sm">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={submitting}
          aria-label={label || placeholder}
        />
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? `${submitLabel}...` : submitLabel}
        </Button>
        <Button
          variant="ghost"
          shape="square"
          onClick={onCancel}
          aria-label="Cancel"
          disabled={submitting}
          icon={<X aria-hidden="true" />}
        />
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground" role="note">
          {helperText}
        </p>
      )}
    </div>
  );
}
