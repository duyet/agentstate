"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="border border-border rounded-lg p-5 mb-4 bg-card">
      {label && (
        <label htmlFor={inputId} className="text-sm text-muted-foreground mb-2 block">
          {label}
        </label>
      )}
      <div className="flex gap-2">
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
        <Button variant="ghost" onClick={onCancel} aria-label="Cancel" disabled={submitting}>
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground mt-2" role="note">
          {helperText}
        </p>
      )}
    </div>
  );
}
