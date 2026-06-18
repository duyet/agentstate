import type { ProjectDetailResponse } from "@agentstate/shared";
import { useCallback } from "react";
import { api } from "@/lib/api";

type ProjectDetail = ProjectDetailResponse;

interface UseKeyActionsProps {
  project: ProjectDetail | null;
  onKeyCreated: (key: string) => void;
  onProjectRefresh: () => Promise<void>;
}

export function useKeyActions({ project, onKeyCreated, onProjectRefresh }: UseKeyActionsProps) {
  const handleCreateKey = useCallback(
    async (keyName: string, scopes?: string[]) => {
      if (!keyName.trim() || !project) return false;
      const res = await api<{ id: string; key: string }>(`/v1/projects/${project.id}/keys`, {
        method: "POST",
        body: JSON.stringify({
          name: keyName.trim(),
          // Omit scopes for a full-access key; send the array for a restricted key.
          ...(scopes && scopes.length > 0 ? { scopes } : {}),
        }),
      });
      onKeyCreated(res.key);
      await onProjectRefresh();
      return true;
    },
    [project, onKeyCreated, onProjectRefresh],
  );

  const handleRevokeKey = useCallback(
    async (keyId: string) => {
      if (!project) return;
      await api(`/v1/projects/${project.id}/keys/${keyId}`, { method: "DELETE" });
      await onProjectRefresh();
    },
    [project, onProjectRefresh],
  );

  return { handleCreateKey, handleRevokeKey };
}
