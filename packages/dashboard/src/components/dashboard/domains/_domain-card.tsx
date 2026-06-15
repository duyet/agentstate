import type { CustomDomainResponse } from "@agentstate/shared";
import { CaretDownIcon, CaretRightIcon, GlobeIcon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { _DomainCardActions } from "./_domain-card-actions";
import { _DomainCardExpanded } from "./_domain-card-expanded";
import { _DomainStatusBadge } from "./_domain-card-status-badge";

type CustomDomain = CustomDomainResponse;

const isVerified = (status: CustomDomain["verification_status"]): boolean => status === "verified";

interface DomainCardHeaderProps {
  domain: string;
  verificationStatus: CustomDomain["verification_status"];
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
    <div className="flex w-full items-center justify-between gap-2 px-4 py-3">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius)] text-left transition-[background-color] hover:bg-panel2"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={`Toggle details for ${domain}`}
      >
        <ChevronIcon className="size-4 shrink-0 text-fg-4" aria-hidden="true" />
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-3">
          <GlobeIcon className="size-4" aria-hidden="true" />
        </span>
        <span className="truncate font-mono text-[13.5px] font-medium text-fg">{domain}</span>
        <_DomainStatusBadge status={verificationStatus} />
      </button>
      <_DomainCardActions
        verified={verified}
        isCheckingVerification={isCheckingVerification}
        onVerify={onVerify}
        onDelete={onDelete}
        domain={domain}
      />
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
