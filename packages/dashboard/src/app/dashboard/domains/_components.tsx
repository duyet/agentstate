"use client";

import type { CustomDomainResponse } from "@agentstate/shared";
import { GlobeIcon, XIcon } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { _DomainCard } from "./_domain-card";

type CustomDomain = CustomDomainResponse;

// ---------------------------------------------------------------------------
// Exported Components
// ---------------------------------------------------------------------------

export interface AddDomainFormProps {
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

export interface DomainsEmptyStateProps {
  onAddDomain: () => void;
}

export function _DomainsEmptyState({ onAddDomain }: DomainsEmptyStateProps) {
  return (
    <Card className="p-12 border-dashed">
      <EmptyState
        icon={<GlobeIcon className="h-8 w-8 text-muted-foreground" />}
        title="No custom domains"
        description="Add a custom domain to serve your project from your own domain with SSL."
        action={{ label: "Add your first domain", onClick: onAddDomain }}
      />
    </Card>
  );
}

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

// Loading skeleton inline in page.tsx instead
export function _DomainsLoadingSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="h-12 w-48 bg-muted/60 rounded animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted/40 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
