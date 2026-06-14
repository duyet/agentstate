import { RefreshCwIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DomainCardActionsProps {
  verified: boolean;
  isCheckingVerification: boolean;
  onVerify: () => void;
  onDelete: () => void;
  domain: string;
}

export function _DomainCardActions({
  verified,
  isCheckingVerification,
  onVerify,
  onDelete,
  domain,
}: DomainCardActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {!verified && (
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={(e) => {
            e.stopPropagation();
            onVerify();
          }}
          disabled={isCheckingVerification}
          aria-label={`Verify ${domain}`}
        >
          <RefreshCwIcon
            data-icon="inline-start"
            aria-hidden="true"
            className={isCheckingVerification ? "animate-spin" : undefined}
          />
          {isCheckingVerification ? "Checking..." : "Verify"}
        </Button>
      )}
      <Button
        size="icon-sm"
        variant="ghost"
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${domain}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <TrashIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
