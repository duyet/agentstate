"use client";

import type { CreateCustomDomainResponse, CustomDomainResponse } from "@agentstate/shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { isValidDomain } from "@/lib/domain-validation";

type CustomDomain = CustomDomainResponse;

interface UseDomainsReturn {
  domains: CustomDomain[];
  loading: boolean;
  adding: boolean;
  checkingVerification: string | null;
  expandedDomains: Set<string>;
  newDomain: string;
  setNewDomain: (value: string) => void;
  handleAddDomain: (onSuccess?: () => void) => void;
  handleDeleteDomain: (domainId: string, domain: string) => void;
  handleCheckVerification: (domainId: string, domain: string) => void;
  toggleDomain: (domainId: string) => void;
}

export function useDomains(projectId: string | null): UseDomainsReturn {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [newDomain, setNewDomain] = useState("");

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

  const handleAddDomain = useCallback(
    async (onSuccess?: () => void) => {
      if (!newDomain.trim() || !projectId) return;
      if (!isValidDomain(newDomain)) {
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
        setNewDomain("");
        setExpandedDomains((prev) => new Set([...prev, res.id]));
        toast.success("Domain added. Follow the instructions to verify ownership.");
        onSuccess?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add domain");
      } finally {
        setAdding(false);
      }
    },
    [newDomain, projectId],
  );

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

  return {
    domains,
    loading,
    adding,
    checkingVerification,
    expandedDomains,
    newDomain,
    setNewDomain,
    handleAddDomain,
    handleDeleteDomain,
    handleCheckVerification,
    toggleDomain,
  };
}
