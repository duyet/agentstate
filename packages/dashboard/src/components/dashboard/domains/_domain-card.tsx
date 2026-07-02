import type { CustomDomainResponse } from "@agentstate/shared";
import { CaretDownIcon, CaretRightIcon, GlobeIcon, TrashIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { _DomainCardExpanded } from "./_domain-card-expanded";

type CustomDomain = CustomDomainResponse;
type VerificationStatus = CustomDomain["verification_status"];

const isVerified = (status: VerificationStatus): boolean => status === "verified";

const STATUS_TONES = {
  verified: "live" as const,
  failed: "warn" as const,
  pending: "idle" as const,
} satisfies Record<VerificationStatus, "live" | "warn" | "idle">;

interface DomainCardHeaderProps {
  domain: string;
  verificationStatus: VerificationStatus;
  isExpanded: boolean;
  isCheckingVerification: boolean;
  onToggle: () => void;
  onVerify: () => void;
  onDelete: () => void;
}

function _DomainCardHeader({
  domain,
  verificationStatus,
  isExpanded,
  isCheckingVerification,
  onToggle,
  onVerify,
  onDelete,
}: DomainCardHeaderProps) {
  const ChevronIcon = isExpanded ? CaretDownIcon : CaretRightIcon;
  const verified = isVerified(verificationStatus);

  return (
    <div className="flex w-full items-center justify-between gap-tight px-4 py-3">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-element rounded-[var(--radius)] text-left transition-[background-color] hover:bg-panel2"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={`Toggle details for ${domain} (${verificationStatus})`}
      >
        <ChevronIcon className="size-4 shrink-0 text-fg-4" aria-hidden="true" />
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-3">
          <GlobeIcon className="size-4" aria-hidden="true" />
        </span>
        <span className="truncate font-mono text-[13.5px] font-medium text-fg">{domain}</span>
        <Badge tone={STATUS_TONES[verificationStatus]} dot>
          {verificationStatus}
        </Badge>
      </button>
      <div className="flex items-center gap-tight">
        {!verified && (
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onVerify();
            }}
            loading={isCheckingVerification}
            aria-label={`Verify ${domain}`}
          >
            {isCheckingVerification ? "Checking..." : "Verify"}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Delete ${domain}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="px-2.5 text-neg hover:bg-neg/10 hover:text-neg"
        >
          <TrashIcon size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export interface DomainCardProps {
  domain: CustomDomain;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onVerify: (id: string, domain: string) => void;
  onDelete: (id: string, domain: string) => void;
  isCheckingVerification: boolean;
}

export function _DomainCard({
  domain,
  isExpanded,
  onToggle,
  onVerify,
  onDelete,
  isCheckingVerification,
}: DomainCardProps) {
  return (
    <Card>
      <_DomainCardHeader
        domain={domain.domain}
        verificationStatus={domain.verification_status}
        isExpanded={isExpanded}
        isCheckingVerification={isCheckingVerification}
        onToggle={() => onToggle(domain.id)}
        onVerify={() => onVerify(domain.id, domain.domain)}
        onDelete={() => onDelete(domain.id, domain.domain)}
      />
      {isExpanded && (
        <_DomainCardExpanded
          domain={domain}
          isCheckingVerification={isCheckingVerification}
          onVerify={() => onVerify(domain.id, domain.domain)}
        />
      )}
    </Card>
  );
}
