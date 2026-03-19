"use client";

import type { CustomDomainResponse } from "@agentstate/shared";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { loadDomains } from "./_domains-service";

export function useDomainsList(projectId: string | null) {
  const [domains, setDomains] = useState<CustomDomainResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDomainsData = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await loadDomains(projectId);
      setDomains(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load domains");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadDomainsData();
  }, [projectId, loadDomainsData]);

  return { domains, loading, loadDomainsData, setDomains };
}
