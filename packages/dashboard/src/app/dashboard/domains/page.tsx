"use client";

import type { CreateCustomDomainResponse, CustomDomainResponse } from "@agentstate/shared";
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  GlobeIcon,
  PlusIcon,
  RefreshCwIcon,
  TrashIcon,
  XIcon,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CardListSkeleton } from "@/components/dashboard/loading-states";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useCopiedText } from "@/lib/hooks/use-copied-text";

type CustomDomain = CustomDomainResponse;

function DomainsContent() {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  // Get project ID from URL - for now we'll use a default or fetch from context
  // In a real implementation, you'd get this from the URL params or context
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Get the first project ID for demo purposes
    // In production, this would come from URL params or project switcher
    async function loadProject() {
      try {
        const projects = await api<{ data: Array<{ project_id: string }> }>("/v1/projects");
        if (projects.data && projects.data.length > 0) {
          setProjectId(projects.data[0].project_id);
        }
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
    loadProject();
  }, []);

  const loadDomains = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await api<{ data: CustomDomain[] }>(`/v1/projects/${projectId}/domains`);
      setDomains(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load domains");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadDomains();
    }
  }, [projectId, loadDomains]);

  async function handleAddDomain() {
    if (!newDomain.trim() || !projectId) return;

    // Basic domain validation
    const domainRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(newDomain.trim())) {
      toast.error("Invalid domain format");
      return;
    }

    setAdding(true);
    try {
      const res = await api<CreateCustomDomainResponse>(`/v1/projects/${projectId}/domains`, {
        method: "POST",
        body: JSON.stringify({ domain: newDomain.trim().toLowerCase() }),
      });
      setDomains((prev) => [...prev, res]);
      setShowAddForm(false);
      setNewDomain("");
      // Auto-expand the newly created domain
      setExpandedDomains((prev) => new Set([...prev, res.id]));
      toast.success("Domain added. Follow the instructions to verify ownership.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add domain");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteDomain(domainId: string, domain: string) {
    if (!projectId) return;
    if (!confirm(`Are you sure you want to delete ${domain}?`)) return;

    try {
      await api(`/v1/projects/${projectId}/domains/${domainId}`, { method: "DELETE" });
      setDomains((prev) => prev.filter((d) => d.id !== domainId));
      setExpandedDomains((prev) => {
        const next = new Set(prev);
        next.delete(domainId);
        return next;
      });
      toast.success("Domain deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete domain");
    }
  }

  async function handleCheckVerification(domainId: string, domain: string) {
    if (!projectId) return;
    setCheckingVerification(domainId);
    try {
      const res = await api<{
        verification_status: CustomDomain["verification_status"];
        verified_at: number | null;
      }>(`/v1/projects/${projectId}/domains/${domainId}/verify`, {
        method: "POST",
      });

      if (res.verification_status === "verified") {
        toast.success(`Domain ${domain} has been verified!`);
        setDomains((prev) =>
          prev.map((d) =>
            d.id === domainId
              ? { ...d, verification_status: "verified", verified_at: res.verified_at }
              : d,
          ),
        );
      } else {
        toast.info("Verification not complete yet. Please wait a few minutes and try again.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification check failed");
    } finally {
      setCheckingVerification(null);
    }
  }

  function toggleDomain(domainId: string) {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  }

  function getStatusVariant(
    status: CustomDomain["verification_status"],
  ): "default" | "destructive" | "secondary" {
    switch (status) {
      case "verified":
        return "default";
      case "failed":
        return "destructive";
      case "pending":
        return "secondary";
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-muted/60 rounded animate-pulse" />
        <CardListSkeleton count={3} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Custom Domains"
        description="Add a custom domain to serve your project from your own domain with SSL."
        actions={
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
            <PlusIcon className="h-4 w-4 mr-1.5" />
            Add Domain
          </Button>
        }
      />

      {showAddForm && (
        <Card className="mb-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Add a custom domain</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="domain-input" className="text-sm text-muted-foreground mb-2 block">
                  Domain name
                </label>
                <div className="flex gap-2">
                  <Input
                    id="domain-input"
                    placeholder="e.g. app.example.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
                    autoFocus
                  />
                  <Button onClick={handleAddDomain} disabled={!newDomain.trim() || adding}>
                    {adding ? "Adding..." : "Add"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAddForm(false)}>
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Enter your domain without the protocol (https://) or path.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {domains.length === 0 ? (
        <Card className="p-12 border-dashed">
          <EmptyState
            icon={<GlobeIcon className="h-8 w-8 text-muted-foreground" />}
            title="No custom domains"
            description="Add a custom domain to serve your project from your own domain with SSL."
            action={{
              label: "Add your first domain",
              onClick: () => setShowAddForm(true),
            }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => {
            const isExpanded = expandedDomains.has(domain.id);
            const isVerified = domain.verification_status === "verified";

            return (
              <Card key={domain.id} size="sm">
                <CardContent className="p-0">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                    onClick={() => toggleDomain(domain.id)}
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
                            handleCheckVerification(domain.id, domain.domain);
                          }}
                          disabled={checkingVerification === domain.id}
                        >
                          <RefreshCwIcon
                            className={`h-3.5 w-3.5 ${checkingVerification === domain.id ? "animate-spin" : ""}`}
                          />
                          {checkingVerification === domain.id ? "Checking..." : "Verify"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500"
                        aria-label={`Delete ${domain.domain}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDomain(domain.id, domain.domain);
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
                              <strong>{domain.domain}</strong>. Verification may take a few minutes
                              to propagate after making changes.
                            </AlertDescription>
                          </Alert>

                          <div className="space-y-4">
                            {/* DNS TXT Record */}
                            <VerificationMethod
                              title="DNS TXT Record (Recommended)"
                              description="Add a TXT record to your domain's DNS configuration."
                              records={[
                                {
                                  label: "Name",
                                  value: `_agentstate.${domain.domain}`,
                                  copy: `_agentstate.${domain.domain}`,
                                },
                                {
                                  label: "Value",
                                  value: domain.verification_token,
                                  copy: domain.verification_token,
                                },
                              ]}
                            />

                            {/* HTTP File */}
                            <VerificationMethod
                              title="HTTP File"
                              description={`Create a file at https://${domain.domain}/.well-known/agentstate-${domain.verification_token}`}
                              records={[
                                {
                                  label: "URL",
                                  value: `https://${domain.domain}/.well-known/agentstate-${domain.verification_token}`,
                                  copy: `/.well-known/agentstate-${domain.verification_token}`,
                                },
                                {
                                  label: "Content",
                                  value: domain.verification_token,
                                  copy: domain.verification_token,
                                },
                              ]}
                            />

                            {/* Meta Tag */}
                            <VerificationMethod
                              title="Meta Tag"
                              description="Add this meta tag to your site's HTML head section."
                              records={[
                                {
                                  label: "Tag",
                                  value: `<meta name="agentstate-verification" content="${domain.verification_token}">`,
                                  copy: `<meta name="agentstate-verification" content="${domain.verification_token}">`,
                                },
                              ]}
                            />
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleCheckVerification(domain.id, domain.domain)}
                            disabled={checkingVerification === domain.id}
                          >
                            <RefreshCwIcon
                              className={`h-4 w-4 mr-1.5 ${checkingVerification === domain.id ? "animate-spin" : ""}`}
                            />
                            {checkingVerification === domain.id
                              ? "Checking..."
                              : "Check Verification"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VerificationMethod({
  title,
  description,
  records,
}: {
  title: string;
  description: string;
  records: { label: string; value: string; copy: string }[];
}) {
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

export default function DomainsPage() {
  return (
    <Suspense fallback={<div className="h-32 bg-muted rounded animate-pulse" />}>
      <DomainsContent />
    </Suspense>
  );
}
