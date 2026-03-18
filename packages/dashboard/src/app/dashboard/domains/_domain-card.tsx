"use client";

import type { CustomDomainResponse } from "@agentstate/shared";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { _VerificationMethod } from "./_verification-method";

type CustomDomain = CustomDomainResponse;

const STATUS_VARIANTS = {
  verified: "default" as const,
  failed: "destructive" as const,
  pending: "secondary" as const,
} as const;

const isVerified = (status: CustomDomain["verification_status"]): boolean => status === "verified";

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
        <Badge variant={STATUS_VARIANTS[verificationStatus]}>{verificationStatus}</Badge>
      </div>
      <div className="flex items-center gap-2">
        {!verified && (
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={(e) => {
              e.stopPropagation();
              onVerify();
            }}
            disabled={isCheckingVerification}
            aria-label={`Verify ${domain}`}
          >
            <RefreshCwIcon
              className={`h-3.5 w-3.5 ${isCheckingVerification ? "animate-spin" : ""}`}
            />
            {isCheckingVerification ? "Checking..." : "Verify"}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
          aria-label={`Delete ${domain}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      </div>
    </button>
  );
}

interface DomainCardExpandedProps {
  domain: CustomDomain;
  isCheckingVerification: boolean;
  onVerify: () => void;
}

function _DomainCardExpanded({
  domain,
  isCheckingVerification,
  onVerify,
}: DomainCardExpandedProps) {
  const verified = isVerified(domain.verification_status);
  const verificationMethods = getVerificationMethods(domain.domain, domain.verification_token);

  return (
    <div className="border-t border-border p-4">
      {verified ? (
        <Alert>
          <CheckIcon className="h-4 w-4" />
          <AlertTitle>Domain verified</AlertTitle>
          <AlertDescription>
            Your domain is verified and ready to use. SSL is{" "}
            {domain.ssl_enabled ? "enabled" : "being provisioned"}.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert>
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Verify your domain</AlertTitle>
            <AlertDescription>
              Choose one of the following methods to verify ownership of{" "}
              <strong>{domain.domain}</strong>. Verification may take a few minutes to propagate
              after making changes.
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
      )}
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
