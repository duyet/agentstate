"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { Button } from "@cloudflare/kumo/components/button";

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
          onClick={(e) => {
            e.stopPropagation();
            onVerify();
          }}
          disabled={isCheckingVerification}
          loading={isCheckingVerification}
          aria-label={`Verify ${domain}`}
        >
          {isCheckingVerification ? "Checking..." : "Verify"}
        </Button>
      )}
      <Button
        shape="square"
        size="sm"
        variant="ghost"
        className="text-kumo-danger"
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
