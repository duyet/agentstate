import type { CustomDomainResponse } from "@agentstate/shared";
import { Banner } from "@cloudflare/kumo/components/banner";
import { Button } from "@cloudflare/kumo/components/button";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { _VerificationMethod } from "./_verification-method";

interface DomainUnverifiedAlertProps {
  domain: CustomDomainResponse;
  isCheckingVerification: boolean;
  onVerify: () => void;
}

const getVerificationMethods = (
  domain: string,
  token: string,
): Array<{
  title: string;
  description: string;
  records: Array<{ label: string; value: string; copy: string }>;
}> => [
  {
    title: "DNS TXT Record (Recommended)",
    description: "Add a TXT record to your domain's DNS configuration.",
    records: [
      { label: "Name", value: `_agentstate.${domain}`, copy: `_agentstate.${domain}` },
      { label: "Value", value: token, copy: token },
    ],
  },
  {
    title: "HTTP File",
    description: `Create a file at https://${domain}/.well-known/agentstate-${token}`,
    records: [
      {
        label: "URL",
        value: `https://${domain}/.well-known/agentstate-${token}`,
        copy: `/.well-known/agentstate-${token}`,
      },
      { label: "Content", value: token, copy: token },
    ],
  },
  {
    title: "Meta Tag",
    description: "Add this meta tag to your site's HTML head section.",
    records: [
      {
        label: "Tag",
        value: `<meta name="agentstate-verification" content="${token}">`,
        copy: `<meta name="agentstate-verification" content="${token}">`,
      },
    ],
  },
];

export function _DomainUnverifiedAlert({
  domain,
  isCheckingVerification,
  onVerify,
}: DomainUnverifiedAlertProps) {
  const verificationMethods = getVerificationMethods(domain.domain, domain.verification_token);

  return (
    <>
      <Banner
        variant="default"
        icon={<WarningCircleIcon aria-hidden="true" weight="fill" />}
        title="Verify your domain"
        description={`Choose one of the following methods to verify ownership of ${domain.domain}. Verification may take a few minutes to propagate after making changes.`}
      />
      <div className="flex flex-col gap-4">
        {verificationMethods.map((method) => (
          <_VerificationMethod key={method.title} {...method} />
        ))}
      </div>
      <Button
        size="sm"
        variant="primary"
        onClick={onVerify}
        disabled={isCheckingVerification}
        loading={isCheckingVerification}
        aria-label={`Check verification status for ${domain.domain}`}
      >
        {isCheckingVerification ? "Checking..." : "Check Verification"}
      </Button>
    </>
  );
}
