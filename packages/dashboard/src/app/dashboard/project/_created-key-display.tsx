import { CheckIcon, CopyIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CreatedKeyDisplayProps {
  apiKey: string;
  copied: boolean;
  onCopy: (text: string) => void;
}

export function _CreatedKeyDisplay({ apiKey, copied, onCopy }: CreatedKeyDisplayProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Your API key</CardTitle>
        <CardAction>
          <Badge variant="brand">shown once</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="flex-1 break-all rounded-lg border border-border bg-bg-deep px-3 py-2 font-mono text-xs text-ink-2">
            {apiKey}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCopy(apiKey)}
            aria-label={copied ? "Copied!" : "Copy API key"}
          >
            {copied ? (
              <CheckIcon className="text-brand" aria-hidden="true" />
            ) : (
              <CopyIcon aria-hidden="true" />
            )}
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Copy this key now. It won&apos;t be shown again.
        </p>
      </CardContent>
    </Card>
  );
}
