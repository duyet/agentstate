import type { ProjectDetailResponse } from "@agentstate/shared";
import { useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type ProjectDetail = ProjectDetailResponse;

interface UseKeyActionsProps {
  project: ProjectDetail | null;
  slug: string | null;
  onKeyCreated: (key: string) => void;
  onProjectRefresh: () => Promise<void>;
}

export function _useKeyActions({
  project,
  slug,
  onKeyCreated,
  onProjectRefresh,
}: UseKeyActionsProps) {
  const handleCreateKey = useCallback(
    async (keyName: string) => {
      if (!keyName.trim() || !project) return false;
      const res = await api<{ id: string; key: string }>(`/v1/projects/${project.id}/keys`, {
        method: "POST",
        body: JSON.stringify({ name: keyName.trim() }),
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
