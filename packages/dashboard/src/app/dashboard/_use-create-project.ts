import type { ProjectListItem } from "@agentstate/shared";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { generateName, toSlug } from "@/lib/name-generator";
import { useSlugAvailability } from "@/lib/slug-validation";

type Project = ProjectListItem;

/**
 * useCreateProject - Hook for managing project creation state and logic.
 *
 * Features:
 * - Form state management (name, slug, visibility)
 * - Auto-generates slug from name
 * - Real-time slug availability checking (debounced)
 * - Project creation with API call
 * - Key storage for one-time display
 * - Navigation to new project
 *
 * @example
 * ```tsx
 * const {
 *   showCreate,
 *   name,
 *   slug,
 *   slugStatus,
 *   handleStartCreate,
 *   handleCreate,
 *   handleCancel
 * } = useCreateProject(projects);
 * ```
 */
export function useCreateProject(projects: Project[]) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [apiError, setApiError] = useState(false);
  const existingSlugs = projects.map((p) => p.slug);
  const slugStatus = useSlugAvailability(slug, existingSlugs);

  // Combine availability status with API error state
  const effectiveSlugStatus: "idle" | "checking" | "available" | "taken" = apiError
    ? "taken"
    : slugStatus;

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugEdited && name) {
      setSlug(toSlug(name));
    }
    if (!name) {
      setSlug("");
      setSlugEdited(false);
    }
  }, [name, slugEdited]);

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !slug) return;
    setApiError(false);
    try {
      const res = await api<{ project: Project; api_key: { key: string } }>("/v1/projects", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), slug }),
      });
      // Store key in sessionStorage (not URL) — shown once on project page
      sessionStorage.setItem(`new_key_${res.project.slug}`, res.api_key.key);
      router.push(`/dashboard/project/?slug=${res.project.slug}`);
    } catch {
      // Show error (e.g., slug taken)
      setApiError(true);
    }
  }, [name, slug, router]);

  const handleCancel = useCallback(() => {
    setShowCreate(false);
    setName("");
    setSlug("");
    setSlugEdited(false);
    setApiError(false);
  }, []);

  const handleStartCreate = useCallback(() => {
    setName(generateName());
    setSlugEdited(false);
    setShowCreate(true);
  }, []);

  const handleSlugChange = useCallback((value: string) => {
    setSlug(toSlug(value));
    setSlugEdited(true);
  }, []);

  const handleNameChange = useCallback((value: string) => {
    setName(value);
  }, []);

  return {
    showCreate,
    name,
    slug,
    slugStatus: effectiveSlugStatus,
    handleStartCreate,
    handleCreate,
    handleCancel,
    handleSlugChange,
    handleNameChange,
  };
}
