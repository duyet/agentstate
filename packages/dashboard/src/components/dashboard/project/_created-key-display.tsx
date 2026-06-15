"use client";

import { Badge } from "@cloudflare/kumo/components/badge";
import { Button } from "@cloudflare/kumo/components/button";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Text } from "@cloudflare/kumo/components/text";
import { Check, Copy } from "@phosphor-icons/react";

interface CreatedKeyDisplayProps {
  apiKey: string;
  copied: boolean;
  onCopy: (text: string) => void;
}

export function _CreatedKeyDisplay({ apiKey, copied, onCopy }: CreatedKeyDisplayProps) {
  return (
    <LayerCard className="mb-6 flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-2">
        <Text variant="heading3" as="h2">
          Your API key
        </Text>
        <Badge variant="info">shown once</Badge>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
            {apiKey}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCopy(apiKey)}
            aria-label={copied ? "Copied!" : "Copy API key"}
          >
            {copied ? <Check className="text-emerald-600" aria-hidden /> : <Copy aria-hidden />}
          </Button>
        </div>
        <Text variant="secondary" size="sm" as="p">
          Copy this key now. It won&apos;t be shown again.
        </Text>
      </div>
    </LayerCard>
  );
}
