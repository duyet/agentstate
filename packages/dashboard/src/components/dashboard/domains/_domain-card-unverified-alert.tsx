import type { CustomDomainResponse } from "@agentstate/shared";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col gap-component">
      <div className="flex items-start gap-2.5 rounded-[var(--radius)] border border-warn/40 bg-warn/10 px-3 py-2.5">
        <WarningCircleIcon
          className="mt-0.5 size-4 shrink-0 text-warn"
          aria-hidden="true"
          weight="fill"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium text-fg">Verify your domain</span>
          <span className="text-[12px] leading-5 text-fg-3">
            Choose one of the following methods to verify ownership of {domain.domain}. Verification
            may take a few minutes to propagate after making changes.
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-element">
        {verificationMethods.map((method) => (
          <_VerificationMethod key={method.title} {...method} />
        ))}
      </div>
      <Button
        variant="primary"
        onClick={onVerify}
        disabled={isCheckingVerification}
        aria-label={`Check verification status for ${domain.domain}`}
        className="self-start"
      >
        {isCheckingVerification ? "Checking..." : "Check Verification"}
      </Button>
    </div>
  );
}
