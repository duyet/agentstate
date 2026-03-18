import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CreatedKeyDisplayProps {
  apiKey: string;
  copied: boolean;
  onCopy: (text: string) => void;
}

export function _CreatedKeyDisplay({ apiKey, copied, onCopy }: CreatedKeyDisplayProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Your API key (shown once)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded break-all">
            {apiKey}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCopy(apiKey)}
            aria-label={copied ? "Copied!" : "Copy API key"}
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Copy this key now. It won&apos;t be shown again.
        </p>
      </CardContent>
    </Card>
  );
}
