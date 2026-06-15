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
      variant={copied ? "secondary" : "primary"}
      className="h-6 gap-1 px-2.5 font-mono text-xs"
      onClick={() => copy(text)}
      aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
