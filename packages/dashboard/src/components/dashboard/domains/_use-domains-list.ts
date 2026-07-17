import type { CustomDomainResponse } from "@agentstate/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { loadDomains } from "./_domains-service";

export function useDomainsList(projectId: string | null) {
  const [domains, setDomains] = useState<CustomDomainResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Guards against setState after unmount and against a slower stale response
  // from a previous project overwriting the current one (#319). `mountedRef`
  // covers unmount; `projectIdRef` covers project switches mid-flight.
  const mountedRef = useRef(true);
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadDomainsData = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await loadDomains(projectId);
      if (!mountedRef.current || projectIdRef.current !== projectId) return;
      setDomains(data);
    } catch (e) {
      if (!mountedRef.current || projectIdRef.current !== projectId) return;
      toast.error(e instanceof Error ? e.message : "Failed to load domains");
    } finally {
      if (mountedRef.current && projectIdRef.current === projectId) {
        setLoading(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) loadDomainsData();
  }, [projectId, loadDomainsData]);

  return { domains, loading, loadDomainsData, setDomains };
}
