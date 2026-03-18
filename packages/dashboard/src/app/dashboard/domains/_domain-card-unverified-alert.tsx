import type { CustomDomainResponse } from "@agentstate/shared";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
    <>
      <Alert>
        <AlertCircleIcon className="h-4 w-4" />
        <AlertTitle>Verify your domain</AlertTitle>
        <AlertDescription>
          Choose one of the following methods to verify ownership of{" "}
          <strong>{domain.domain}</strong>. Verification may take a few minutes to propagate after
          making changes.
        </AlertDescription>
      </Alert>
      <div className="space-y-4">
        {verificationMethods.map((method) => (
          <_VerificationMethod key={method.title} {...method} />
        ))}
      </div>
      <Button
        size="sm"
        onClick={onVerify}
        disabled={isCheckingVerification}
        aria-label={`Check verification status for ${domain.domain}`}
      >
        <RefreshCwIcon
          className={`h-4 w-4 mr-1.5 ${isCheckingVerification ? "animate-spin" : ""}`}
        />
        {isCheckingVerification ? "Checking..." : "Check Verification"}
      </Button>
    </>
  );
}
