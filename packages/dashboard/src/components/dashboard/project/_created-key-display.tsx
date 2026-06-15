"use client";

import { Check, Copy } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CreatedKeyDisplayProps {
  apiKey: string;
  copied: boolean;
  onCopy: (text: string) => void;
}

export function _CreatedKeyDisplay({ apiKey, copied, onCopy }: CreatedKeyDisplayProps) {
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight text-fg">Your API key</h2>
        <Badge tone="warn">shown once</Badge>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <code className="num flex-1 break-all rounded-[var(--radius)] border border-edge bg-panel2 px-3 py-2 font-mono text-xs text-fg-2">
            {apiKey}
          </code>
          <Button
            variant="secondary"
            onClick={() => onCopy(apiKey)}
            aria-label={copied ? "Copied!" : "Copy API key"}
          >
            {copied ? (
              <Check size={16} className="text-pos" aria-hidden />
            ) : (
              <Copy size={16} aria-hidden />
            )}
          </Button>
        </div>
        <p className="text-[13px] text-fg-3">Copy this key now. It won&apos;t be shown again.</p>
      </div>
    </Card>
  );
}
