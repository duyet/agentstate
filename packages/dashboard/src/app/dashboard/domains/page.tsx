"use client";

import type { CreateCustomDomainResponse, CustomDomainResponse } from "@agentstate/shared";
import { PlusIcon } from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  _AddDomainForm,
  _DomainsEmptyState,
  _DomainsList,
  _DomainsLoadingSkeleton,
} from "./_components";

type CustomDomain = CustomDomainResponse;

// ---------------------------------------------------------------------------
// Domains Page
// ---------------------------------------------------------------------------

export default function DomainsPage() {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const projects = await api<{ data: Array<{ project_id: string }> }>("/v1/projects");
        if (projects.data?.[0]) setProjectId(projects.data[0].project_id);
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    })();
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
    if (projectId) loadDomains();
  }, [projectId, loadDomains]);

  const handleAddDomain = useCallback(async () => {
    if (!newDomain.trim() || !projectId) return;
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
      setExpandedDomains((prev) => new Set([...prev, res.id]));
      toast.success("Domain added. Follow the instructions to verify ownership.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add domain");
    } finally {
      setAdding(false);
    }
  }, [newDomain, projectId]);

  const handleDeleteDomain = useCallback(
    async (domainId: string, domain: string) => {
      if (!projectId || !confirm(`Are you sure you want to delete ${domain}?`)) return;
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
    },
    [projectId],
  );

  const handleCheckVerification = useCallback(
    async (domainId: string, domain: string) => {
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
    },
    [projectId],
  );

  const toggleDomain = useCallback((domainId: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domainId)) {
        next.delete(domainId);
      } else {
        next.add(domainId);
      }
      return next;
    });
  }, []);

  if (loading) {
    return <_DomainsLoadingSkeleton />;
  }

  return (
    <Suspense fallback={<div className="h-32 bg-muted rounded animate-pulse" />}>
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
          <_AddDomainForm
            value={newDomain}
            onChange={setNewDomain}
            onSubmit={handleAddDomain}
            onCancel={() => setShowAddForm(false)}
            adding={adding}
          />
        )}

        {domains.length === 0 ? (
          <_DomainsEmptyState onAddDomain={() => setShowAddForm(true)} />
        ) : (
          <_DomainsList
            domains={domains}
            expandedDomains={expandedDomains}
            checkingVerification={checkingVerification}
            onToggle={toggleDomain}
            onVerify={handleCheckVerification}
            onDelete={handleDeleteDomain}
          />
        )}
      </div>
    </Suspense>
  );
}
