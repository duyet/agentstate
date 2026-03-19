"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useProjectId(): string | null {
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const projects = await api<{ data: Array<{ project_id: string }> }>("/v1/projects");
        if (projects.data?.[0]) setProjectId(projects.data[0].project_id);
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    })();
  }, []);

  return projectId;
}
