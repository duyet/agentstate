"use client";

import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <Card className="mb-6 border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Add a custom domain</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Label htmlFor="domain-input">Domain name</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="domain-input"
            placeholder="e.g. app.example.com"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isSubmitDisabled) {
                onSubmit();
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button onClick={onSubmit} disabled={isSubmitDisabled}>
              {adding ? "Adding..." : "Add"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              aria-label="Cancel adding domain"
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter your domain without the protocol (https://) or path.
        </p>
      </CardContent>
    </Card>
  );
}
