import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import ProjectPageContent from "./project-content";

/**
 * Astro entry for the /dashboard/project route.
 * Wraps the ported Next page body in the shared auth-gated dashboard shell.
 * <Suspense> is required because the body reads `useSearchParams` (shimmed).
 */
export function ProjectPage() {
  return (
    <DashboardShell>
      <Suspense>
        <ProjectPageContent />
      </Suspense>
    </DashboardShell>
  );
}
