import type { CustomDomainResponse } from "@agentstate/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useProjectScope } from "@/components/project-scope";
import { loadDomains } from "./_domains-service";

export function useDomainsList(projectId: string | null) {
  const { loadingProjects } = useProjectScope();
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
    // Wait for the shared project list so a still-loading scope is not
    // treated as "no project" (which would drop the skeleton too early).
    if (loadingProjects) return;
    if (projectId) {
      loadDomainsData();
      return;
    }
    setDomains([]);
    setLoading(false);
  }, [projectId, loadingProjects, loadDomainsData]);

  return { domains, loading, loadDomainsData, setDomains };
}
