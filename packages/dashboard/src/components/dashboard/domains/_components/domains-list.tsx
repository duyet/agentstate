import type { CustomDomainResponse } from "@agentstate/shared";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

function DomainsList({
  domains,
  expandedDomains,
  checkingVerification,
  onToggle,
  onVerify,
  onDelete,
}: DomainsListProps) {
  const [pendingDelete, setPendingDelete] = useState<{ id: string; domain: string } | null>(null);

  return (
    <div className="flex flex-col gap-element">
      {domains.map((domain) => (
        <_DomainCard
          key={domain.id}
          domain={domain}
          isExpanded={expandedDomains.has(domain.id)}
          onToggle={onToggle}
          onVerify={onVerify}
          onDelete={(id, name) => setPendingDelete({ id, domain: name })}
          isCheckingVerification={checkingVerification === domain.id}
        />
      ))}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={`Delete ${pendingDelete?.domain ?? "this domain"}?`}
        description="This will remove the domain and its verification records. This action cannot be undone."
        confirmLabel="Delete domain"
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id, pendingDelete.domain);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

export { DomainsList as _DomainsList };
