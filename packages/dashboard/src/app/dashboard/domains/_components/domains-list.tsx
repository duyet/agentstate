"use client";

import type { CustomDomainResponse } from "@agentstate/shared";
import { _DomainCard } from "../_domain-card";

type CustomDomain = CustomDomainResponse;

export interface DomainsListProps {
  domains: CustomDomain[];
  expandedDomains: Set<string>;
  checkingVerification: string | null;
  onToggle: (id: string) => void;
  onVerify: (id: string, domain: string) => void;
  onDelete: (id: string, domain: string) => void;
}

export function _DomainsList({
  domains,
  expandedDomains,
  checkingVerification,
  onToggle,
  onVerify,
  onDelete,
}: DomainsListProps) {
  return (
    <div className="space-y-3">
      {domains.map((domain) => (
        <_DomainCard
          key={domain.id}
          domain={domain}
          isExpanded={expandedDomains.has(domain.id)}
          onToggle={onToggle}
          onVerify={onVerify}
          onDelete={onDelete}
          isCheckingVerification={checkingVerification === domain.id}
        />
      ))}
    </div>
  );
}
