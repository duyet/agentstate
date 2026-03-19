"use client";

import type { CustomDomainResponse } from "@agentstate/shared";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { isValidDomain } from "@/lib/domain-validation";
import { addDomain, checkDomainVerification, deleteDomain } from "./_domains-service";

export function useDomainActions(
  projectId: string | null,
  setDomains: React.Dispatch<React.SetStateAction<CustomDomainResponse[]>>,
  setExpandedDomains: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  const [adding, setAdding] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState<string | null>(null);

  const handleAddDomain = useCallback(
    async (newDomain: string, onSuccess?: () => void) => {
      if (!newDomain.trim() || !projectId) return;
      if (!isValidDomain(newDomain)) {
        toast.error("Invalid domain format");
        return;
      }
      setAdding(true);
      try {
        const res = await addDomain(projectId, newDomain);
        setDomains((prev) => [...prev, res]);
        setExpandedDomains((prev) => new Set([...prev, res.id]));
        toast.success("Domain added. Follow the instructions to verify ownership.");
        onSuccess?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add domain");
      } finally {
        setAdding(false);
      }
    },
    [projectId, setDomains, setExpandedDomains],
  );

  const handleDeleteDomain = useCallback(
    async (domainId: string, domain: string) => {
      if (!projectId || !confirm(`Are you sure you want to delete ${domain}?`)) return;
      try {
        await deleteDomain(projectId, domainId);
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
    [projectId, setDomains, setExpandedDomains],
  );

  const handleCheckVerification = useCallback(
    async (domainId: string, domain: string) => {
      if (!projectId) return;
      setCheckingVerification(domainId);
      try {
        const res = await checkDomainVerification(projectId, domainId);
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
    [projectId, setDomains],
  );

  return {
    adding,
    checkingVerification,
    handleAddDomain,
    handleDeleteDomain,
    handleCheckVerification,
  };
}
