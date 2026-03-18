"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopiedText } from "@/lib/hooks/use-copied-text";

interface VerificationRecordProps {
  label: string;
  value: string;
  copy: string;
}

export function _VerificationRecord({ label, value, copy }: VerificationRecordProps) {
  const { copied, copy: copyToClipboard } = useCopiedText();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground w-16 shrink-0">{label}:</span>
      <code className="flex-1 text-sm font-mono bg-muted px-2 py-1.5 rounded break-all">
        {value}
      </code>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => copyToClipboard(copy)}
        className="h-6 px-2 shrink-0"
        aria-label={copied ? "Copied!" : `Copy ${label}`}
      >
        {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
