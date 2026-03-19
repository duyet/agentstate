import type { ProjectDetailResponse } from "@agentstate/shared";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type ProjectDetail = ProjectDetailResponse;

export function _useDeleteProject(project: ProjectDetail | null) {
  const router = useRouter();
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteProject = useCallback(async () => {
    if (!project || deleteConfirmSlug !== project.slug) return;
    setDeleting(true);
    try {
      await api(`/v1/projects/${project.id}`, { method: "DELETE" });
      toast.success(`Project "${project.name}" deleted`);
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete project");
      setDeleting(false);
    }
  }, [project, deleteConfirmSlug, router]);

  return { deleteConfirmSlug, deleting, setDeleteConfirmSlug, handleDeleteProject };
}
