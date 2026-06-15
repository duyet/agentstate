import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import ProjectPageContent from "./project-content";

/**
 * Astro entry for the /dashboard/project route.
 * Wraps the ported Next page body in Providers (Clerk) + AppShell
 * (sidebar/topbar + auth gate). <Suspense> is required because the body
 * reads `useSearchParams` (shimmed).
 */
export function ProjectPage() {
  return (
    <Providers>
      <AppShell>
        <Suspense>
          <ProjectPageContent />
        </Suspense>
      </AppShell>
    </Providers>
  );
}
