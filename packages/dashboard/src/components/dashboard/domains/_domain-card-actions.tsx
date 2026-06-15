import { TrashIcon } from "@phosphor-icons/react";
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
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onVerify();
          }}
          disabled={isCheckingVerification}
          aria-label={`Verify ${domain}`}
          className="min-h-[32px] px-3 py-1.5 text-[12px]"
        >
          {isCheckingVerification ? "Checking..." : "Verify"}
        </Button>
      )}
      <Button
        variant="ghost"
        aria-label={`Delete ${domain}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="min-h-[32px] px-2.5 text-neg hover:bg-neg/10 hover:text-neg"
      >
        <TrashIcon size={15} aria-hidden="true" />
      </Button>
    </div>
  );
}
