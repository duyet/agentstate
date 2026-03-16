"use client";

import { CheckIcon, FolderIcon, KeyIcon, LoaderIcon, PlusIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { generateName, toSlug } from "@/lib/name-generator";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  slug: string;
  key_count?: number;
  created_at: number;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // Fetch projects on mount
  useEffect(() => {
    api<{ data: Project[] }>("/v1/projects")
      .then((res) => setProjects(res.data))
      .catch((err) => toast.error(getErrorMessage(err, "Failed to load projects")));
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
      toast.success("Project created");
      router.push(`/dashboard/project/?slug=${res.project.slug}`);
    } catch (err: unknown) {
      setSlugStatus("taken");
      toast.error(getErrorMessage(err, "Failed to create project"));
    }
  }

  function handleCancel() {
    setShowCreate(false);
    setNewName("");
    setSlug("");
    setSlugEdited(false);
    setSlugStatus("idle");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your API projects and keys.</p>
        </div>
        <Button
          size="sm"
          className="text-xs h-8"
          onClick={() => {
            setNewName(generateName());
            setSlugEdited(false);
            setShowCreate(true);
          }}
        >
          <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border border-border rounded-lg p-6 mb-6 bg-card">
          <p className="text-sm font-medium text-foreground mb-1">Create project</p>
          <p className="text-xs text-muted-foreground mb-5">
            Give your project a name. The slug is used in API paths.
          </p>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="project-name"
                className="text-xs font-medium text-foreground mb-1.5 block"
              >
                Project name
              </label>
              <Input
                id="project-name"
                placeholder="My Chatbot"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="text-sm h-9"
                autoFocus
              />
            </div>

            {/* Slug */}
            <div>
              <label
                htmlFor="project-slug"
                className="text-xs font-medium text-foreground mb-1.5 block"
              >
                Project slug
              </label>
              <div className="relative">
                <Input
                  id="project-slug"
                  placeholder="my-chatbot"
                  value={slug}
                  onChange={(e) => {
                    setSlug(toSlug(e.target.value));
                    setSlugEdited(true);
                  }}
                  className={`text-sm h-9 font-mono pr-8 ${
                    slugStatus === "taken" ? "border-red-500 focus-visible:ring-red-500" : ""
                  }`}
                />
                {slug && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    {slugStatus === "checking" && (
                      <LoaderIcon className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                    )}
                    {slugStatus === "available" && (
                      <CheckIcon className="h-3.5 w-3.5 text-green-500" />
                    )}
                    {slugStatus === "taken" && <XIcon className="h-3.5 w-3.5 text-red-500" />}
                  </div>
                )}
              </div>
              {slugStatus === "taken" && (
                <p className="text-xs text-red-500 mt-1.5">
                  This slug is already taken. Choose a different one.
                </p>
              )}
              {slugStatus === "available" && slug && (
                <p className="text-xs text-muted-foreground mt-1.5">Available</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-border">
            <Button size="sm" variant="ghost" className="text-xs h-8 px-4" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs h-8 px-4"
              onClick={handleCreate}
              disabled={
                !newName.trim() || !slug || slugStatus === "taken" || slugStatus === "checking"
              }
            >
              Create project
            </Button>
          </div>
        </div>
      )}

      {/* Project list */}
      {projects.length > 0 ? (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">
                  Name
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">
                  API Keys
                </th>
                <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium hidden sm:table-cell">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b last:border-b-0 border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/project/?slug=${project.slug}`)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/dashboard/project/?slug=${project.slug}`);
                    }
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <FolderIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{project.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{project.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <KeyIcon className="h-3 w-3" />
                      {project.key_count ?? 0}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    {new Date(project.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !showCreate ? (
        <div className="border border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted mb-4">
            <FolderIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-foreground mb-1">No projects yet</p>
          <p className="text-xs text-muted-foreground max-w-xs mb-4">
            Projects group your conversations and API keys.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => {
              setNewName(generateName());
              setSlugEdited(false);
              setShowCreate(true);
            }}
          >
            <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
            Create your first project
          </Button>
        </div>
      ) : null}
    </div>
  );
}
