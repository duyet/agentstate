"use client";

import { Button } from "@/components/ui/button";
import { useCopiedText } from "@/lib/hooks/use-copied-text";

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
  const { copied, copy } = useCopiedText();

  return (
    <Button
      size="sm"
      variant={copied ? "outline" : "default"}
      className="font-mono text-xs h-6 px-2.5"
      onClick={() => copy(text)}
      aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
