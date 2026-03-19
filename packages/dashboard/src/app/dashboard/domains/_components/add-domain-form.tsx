"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  return (
    <Card className="mb-6 border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Add a custom domain</CardTitle>
      </CardHeader>
      <CardContent>
        <label htmlFor="domain-input" className="text-sm text-muted-foreground mb-2 block">
          Domain name
        </label>
        <div className="flex gap-2">
          <Input
            id="domain-input"
            placeholder="e.g. app.example.com"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoFocus
          />
          <Button onClick={onSubmit} disabled={!value.trim() || adding}>
            {adding ? "Adding..." : "Add"}
          </Button>
          <Button variant="ghost" onClick={onCancel} aria-label="Cancel adding domain">
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Enter your domain without the protocol (https://) or path.
        </p>
      </CardContent>
    </Card>
  );
}
