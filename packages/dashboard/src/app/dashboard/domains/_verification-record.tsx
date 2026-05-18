"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopiedText } from "@/lib/hooks/use-copied-text";

interface VerificationRecordProps {
  label: string;
  value: string;
  copy: string;
}

export function VerificationRecord({ label, value, copy }: VerificationRecordProps) {
  const { copied, copy: copyToClipboard } = useCopiedText();
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-sm text-muted-foreground">{label}:</span>
      <code className="flex-1 break-all rounded-md bg-muted px-2 py-1.5 font-mono text-sm">
        {value}
      </code>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => copyToClipboard(copy)}
        className="shrink-0"
        aria-label={copied ? "Copied!" : `Copy ${label}`}
      >
        {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      </Button>
    </div>
  );
}
