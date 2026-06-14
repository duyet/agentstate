"use client";

import { Input } from "@cloudflare/kumo/components/input";
import { Check, Spinner, X } from "@phosphor-icons/react";

type SlugStatus = "idle" | "checking" | "available" | "taken";

interface ProjectSlugInputProps {
  value: string;
  status: SlugStatus;
  onChange: (slug: string) => void;
}

export function ProjectSlugInput({ value, status, onChange }: ProjectSlugInputProps) {
  const isTaken = status === "taken";
  const isAvailable = status === "available" && !!value;

  return (
    <div className="relative">
      <Input
        label="Project slug"
        placeholder="my-chatbot"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        variant={isTaken ? "error" : "default"}
        className="font-mono pr-8"
        error={isTaken ? "This slug is already taken. Choose a different one." : undefined}
        description={isAvailable ? "Available" : undefined}
      />
      {value && (
        <div className="pointer-events-none absolute top-[34px] right-2.5" aria-hidden="true">
          {status === "checking" && (
            <Spinner className="size-4 animate-spin text-muted-foreground" />
          )}
          {isAvailable && <Check className="size-4 text-emerald-600" />}
          {isTaken && <X className="size-4 text-kumo-danger" />}
        </div>
      )}
    </div>
  );
}
