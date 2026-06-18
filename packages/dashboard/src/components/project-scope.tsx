"use client";

import type { ProjectResponse } from "@agentstate/shared";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

const STORAGE_KEY = "agentstate:active-project";

interface ProjectScopeValue {
  projects: ProjectResponse[];
  loadingProjects: boolean;
  selectedProjectId: string;
  selectedProject: ProjectResponse | undefined;
  setSelectedProjectId: (id: string) => void;
}

const ProjectScopeContext = createContext<ProjectScopeValue | null>(null);

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(id: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Private mode / storage disabled — selection just won't persist.
  }
}

/**
 * ProjectScopeProvider — single source of truth for the dashboard's active
 * project. Fetches the project list once, restores the last selection from
 * localStorage (falling back to the first project), and exposes a setter that
 * persists. Project-scoped pages (conversations, traces, analytics) read from
 * this instead of maintaining their own selector, so the sidebar switcher
 * controls them all.
 */
export function ProjectScopeProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string>("");

  const setSelectedProjectId = useCallback((id: string) => {
    setSelectedProjectIdState(id);
    writeStored(id);
  }, []);

  useEffect(() => {
    setLoadingProjects(true);
    api<{ data: ProjectResponse[] }>("/v1/projects")
      .then((res) => {
        setProjects(res.data);
        if (res.data.length === 0) return;
        const stored = readStored();
        const valid = stored && res.data.some((p) => p.id === stored);
        setSelectedProjectIdState(valid ? (stored as string) : res.data[0].id);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load projects"))
      .finally(() => setLoadingProjects(false));
  }, []);

  const value = useMemo<ProjectScopeValue>(
    () => ({
      projects,
      loadingProjects,
      selectedProjectId,
      selectedProject: projects.find((p) => p.id === selectedProjectId),
      setSelectedProjectId,
    }),
    [projects, loadingProjects, selectedProjectId, setSelectedProjectId],
  );

  return <ProjectScopeContext.Provider value={value}>{children}</ProjectScopeContext.Provider>;
}

export function useProjectScope(): ProjectScopeValue {
  const ctx = useContext(ProjectScopeContext);
  if (!ctx) {
    throw new Error("useProjectScope must be used within a ProjectScopeProvider");
  }
  return ctx;
}
