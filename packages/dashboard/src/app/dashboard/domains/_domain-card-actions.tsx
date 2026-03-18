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
            className={`h-3.5 w-3.5 ${isCheckingVerification ? "animate-spin" : ""}`}
          />
          {isCheckingVerification ? "Checking..." : "Verify"}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
        aria-label={`Delete ${domain}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
