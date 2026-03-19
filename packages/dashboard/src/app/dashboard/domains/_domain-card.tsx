"use client";

import type { CustomDomainResponse } from "@agentstate/shared";
import { ChevronDownIcon, ChevronRightIcon, GlobeIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  const ChevronIcon = isExpanded ? ChevronDownIcon : ChevronRightIcon;
  const verified = isVerified(verificationStatus);

  return (
    <button
      type="button"
      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={`Toggle details for ${domain}`}
    >
      <div className="flex items-center gap-3">
        <ChevronIcon className="h-4 w-4 text-muted-foreground" />
        <GlobeIcon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{domain}</span>
        <_DomainStatusBadge status={verificationStatus} />
      </div>
      <_DomainCardActions
        verified={verified}
        isCheckingVerification={isCheckingVerification}
        onVerify={onVerify}
        onDelete={onDelete}
        domain={domain}
      />
    </button>
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
    <Card size="sm">
      <CardContent className="p-0">
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
      </CardContent>
    </Card>
  );
}
