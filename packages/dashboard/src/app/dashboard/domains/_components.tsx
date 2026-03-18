"use client";

import type { CustomDomainResponse } from "@agentstate/shared";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  GlobeIcon,
  RefreshCwIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CardListSkeleton, PageHeaderSkeleton } from "@/components/dashboard/loading-states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCopiedText } from "@/lib/hooks/use-copied-text";

type CustomDomain = CustomDomainResponse;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const getVerificationMethods = (
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

// ---------------------------------------------------------------------------
// Verification Method Component
// ---------------------------------------------------------------------------

interface VerificationMethodProps {
  title: string;
  description: string;
  records: { label: string; value: string; copy: string }[];
}

export function _VerificationMethod({ title, description, records }: VerificationMethodProps) {
  const { copied, copy } = useCopiedText();

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <h4 className="font-medium mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="space-y-2">
        {records.map((record) => (
          <div key={record.label} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-16 shrink-0">{record.label}:</span>
            <code className="flex-1 text-sm font-mono bg-muted px-2 py-1.5 rounded break-all">
              {record.value}
            </code>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => copy(record.copy)}
              className="h-6 px-2 shrink-0"
              aria-label={copied ? "Copied!" : `Copy ${record.label}`}
            >
              {copied ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Domain Card Component
// ---------------------------------------------------------------------------

interface DomainCardProps {
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
  const isVerified = domain.verification_status === "verified";

  const getStatusVariant = (
    status: CustomDomain["verification_status"],
  ): "default" | "destructive" | "secondary" => {
    switch (status) {
      case "verified":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
    }
  };

  const verificationMethods = getVerificationMethods(domain.domain, domain.verification_token);

  return (
    <Card size="sm">
      <CardContent className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
          onClick={() => onToggle(domain.id)}
          aria-expanded={isExpanded}
          aria-label={`Toggle details for ${domain.domain}`}
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
            )}
            <GlobeIcon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{domain.domain}</span>
            <Badge variant={getStatusVariant(domain.verification_status)}>
              {domain.verification_status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {!isVerified && (
              <Button
                size="sm"
                variant="outline"
                className="h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onVerify(domain.id, domain.domain);
                }}
                disabled={isCheckingVerification}
                aria-label={`Verify ${domain.domain}`}
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
              aria-label={`Delete ${domain.domain}`}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(domain.id, domain.domain);
              }}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border p-4 space-y-4">
            {isVerified ? (
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
                    <strong>{domain.domain}</strong>. Verification may take a few minutes to
                    propagate after making changes.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  {verificationMethods.map((method) => (
                    <_VerificationMethod key={method.title} {...method} />
                  ))}
                </div>

                <Button
                  size="sm"
                  onClick={() => onVerify(domain.id, domain.domain)}
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
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Add Domain Form Component
// ---------------------------------------------------------------------------

interface AddDomainFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  adding: boolean;
}

export function _AddDomainForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  adding,
}: AddDomainFormProps) {
  return (
    <Card className="mb-6 border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Add a custom domain</CardTitle>
      </CardHeader>
      <CardContent>
        <label htmlFor="domain-input" className="text-sm text-muted-foreground mb-2 block">
          Domain name
        </label>
        <div className="flex gap-2">
          <Input
            id="domain-input"
            placeholder="e.g. app.example.com"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            autoFocus
          />
          <Button onClick={onSubmit} disabled={!value.trim() || adding}>
            {adding ? "Adding..." : "Add"}
          </Button>
          <Button variant="ghost" onClick={onCancel} aria-label="Cancel adding domain">
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Enter your domain without the protocol (https://) or path.
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Domains Empty State Component
// ---------------------------------------------------------------------------

interface DomainsEmptyStateProps {
  onAddDomain: () => void;
}

export function _DomainsEmptyState({ onAddDomain }: DomainsEmptyStateProps) {
  return (
    <Card className="p-12 border-dashed">
      <EmptyState
        icon={<GlobeIcon className="h-8 w-8 text-muted-foreground" />}
        title="No custom domains"
        description="Add a custom domain to serve your project from your own domain with SSL."
        action={{
          label: "Add your first domain",
          onClick: onAddDomain,
        }}
      />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Domains List Component
// ---------------------------------------------------------------------------

interface DomainsListProps {
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

// ---------------------------------------------------------------------------
// Domains Loading Skeleton Component
// ---------------------------------------------------------------------------

export function _DomainsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton hasAction />
      <CardListSkeleton count={3} />
    </div>
  );
}
