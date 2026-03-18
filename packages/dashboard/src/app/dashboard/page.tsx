"use client";

import type { ProjectListItem } from "@agentstate/shared";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CardListSkeleton } from "@/components/dashboard/loading-states";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { generateName, toSlug } from "@/lib/name-generator";
import { CreateProjectForm } from "./_create-project-form";
import { ProjectsEmptyState } from "./_projects-empty-state";
import { ProjectsTable } from "./_projects-table";

type Project = ProjectListItem;

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Fetch projects on mount
  useEffect(() => {
    api<{ data: Project[] }>("/v1/projects")
      .then((res) => setProjects(res.data))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load projects"))
      .finally(() => setLoadingProjects(false));
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited && newName) {
      setSlug(toSlug(newName));
    }
    if (!newName) {
      setSlug("");
      setSlugEdited(false);
    }
  }, [newName, slugEdited]);

  // Check slug availability (debounced)
  const checkSlug = useCallback(
    (s: string) => {
      if (!s) {
        setSlugStatus("idle");
        return;
      }
      setSlugStatus("checking");
      const timer = setTimeout(() => {
        const taken = projects.some((p) => p.slug === s);
        setSlugStatus(taken ? "taken" : "available");
      }, 300);
      return () => clearTimeout(timer);
    },
    [projects],
  );

  useEffect(() => {
    const cleanup = checkSlug(slug);
    return cleanup;
  }, [slug, checkSlug]);

  async function handleCreate() {
    if (!newName.trim() || !slug) return;
    try {
      const res = await api<{ project: Project; api_key: { key: string } }>("/v1/projects", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim(), slug }),
      });
      // Store key in sessionStorage (not URL) — shown once on project page
      sessionStorage.setItem(`new_key_${res.project.slug}`, res.api_key.key);
      router.push(`/dashboard/project/?slug=${res.project.slug}`);
    } catch {
      // Show error (e.g., slug taken)
      setSlugStatus("taken");
    }
  }

  function handleCancel() {
    setShowCreate(false);
    setNewName("");
    setSlug("");
    setSlugEdited(false);
    setSlugStatus("idle");
  }

  const handleStartCreate = useCallback(() => {
    setNewName(generateName());
    setSlugEdited(false);
    setShowCreate(true);
  }, []);

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Manage your API projects and keys."
        actions={
          <Button size="sm" className="text-xs h-8" onClick={handleStartCreate}>
            <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
            New Project
          </Button>
        }
      />

      {/* Create form */}
      {showCreate && (
        <CreateProjectForm
          name={newName}
          slug={slug}
          slugStatus={slugStatus}
          onNameChange={setNewName}
          onSlugChange={(value) => {
            setSlug(toSlug(value));
            setSlugEdited(true);
          }}
          onCreate={handleCreate}
          onCancel={handleCancel}
        />
      )}

      {/* Loading state */}
      {loadingProjects && !showCreate && <CardListSkeleton count={3} />}

      {/* Project list */}
      {!loadingProjects && projects.length > 0 && <ProjectsTable projects={projects} />}

      {/* Empty state */}
      {!loadingProjects && projects.length === 0 && !showCreate && (
        <ProjectsEmptyState onCreateClick={handleStartCreate} />
      )}
    </div>
  );
}
