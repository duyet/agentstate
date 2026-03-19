import type { CustomDomainResponse } from "@agentstate/shared";
import { _DomainUnverifiedAlert } from "./_domain-card-unverified-alert";
import { _DomainVerifiedAlert } from "./_domain-card-verified-alert";

type CustomDomain = CustomDomainResponse;

const isVerified = (status: CustomDomain["verification_status"]): boolean => status === "verified";

interface DomainCardExpandedProps {
  domain: CustomDomain;
  isCheckingVerification: boolean;
  onVerify: () => void;
}

export function _DomainCardExpanded({
  domain,
  isCheckingVerification,
  onVerify,
}: DomainCardExpandedProps) {
  const verified = isVerified(domain.verification_status);

  return (
    <div className="border-t border-border p-4">
      {verified ? (
        <_DomainVerifiedAlert sslEnabled={domain.ssl_enabled} />
      ) : (
        <_DomainUnverifiedAlert
          domain={domain}
          isCheckingVerification={isCheckingVerification}
          onVerify={onVerify}
        />
      )}
    </div>
  );
}
