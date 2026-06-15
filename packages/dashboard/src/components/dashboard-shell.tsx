import { SignIn, useAuth } from "@clerk/react";
import { Loader, SidebarProvider } from "@cloudflare/kumo";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";

/**
 * Auth gate + dashboard chrome for Astro dashboard pages.
 *
 * Replaces src/app/dashboard/layout.tsx. In Next.js the layout used useAuth()
 * to gate rendering. In Astro there are no auto-layouts and client:only islands
 * cannot receive server-rendered slot children, so each dashboard page must
 * render a single client:only island that wraps its content in this shell:
 *
 *   src/pages/dashboard/index.astro:
 *   ---
 *   import DashboardLayout from "@/layouts/DashboardLayout.astro";
 *   import { ProjectsPage } from "@/components/dashboard/projects-page";
 *   ---
 *   <DashboardLayout>
 *     <ProjectsPage client:only="react" />
 *   </DashboardLayout>
 *
 *   src/components/dashboard/projects-page.tsx:
 *   import { DashboardShell } from "@/components/dashboard-shell";
 *   export function ProjectsPage() {
 *     return <DashboardShell><ProjectsContent /></DashboardShell>;
 *   }
 *
 * While Clerk loads, children are hidden (the loader renders instead). When
 * signed out, the SignIn component renders instead of the children.
 */
function GatedContent({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader size="lg" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <SignIn routing="hash" />
      </div>
    );
  }

  return (
    <SidebarProvider variant="inset" collapsible="icon" peekable>
      <AppSidebar />
      <main className="flex flex-1 flex-col min-w-0">
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">{children}</div>
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <GatedContent>{children}</GatedContent>
    </Providers>
  );
}
