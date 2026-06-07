"use client";

import { SignIn, useAuth } from "@clerk/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Pill } from "@/components/brand/bits";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const dashboardApiEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || "agentstate.app/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  // Loading state while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    );
  }

  // Not signed in — show Clerk sign-in modal
  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <SignIn routing="hash" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-background">
        {/* ── Topbar ─────────────────────────────────── */}
        <header className="sticky top-0 z-30 flex h-13 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/80 backdrop-blur-lg px-4 sm:px-6">
          {/* Left side: sidebar toggle + status pill */}
          <div className="flex items-center gap-2.5">
            <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
            <div className="hidden h-4 w-px bg-border sm:block" />
            <Pill className="hidden py-[3px] sm:inline-flex">
              <span className="size-2 rounded-full bg-brand" />
              Live
            </Pill>
          </div>

          {/* Right side: endpoint badge */}
          <code className="hidden font-mono text-[11px] text-faint lg:block">
            {dashboardApiEndpoint}
          </code>
        </header>

        {/* ── Main content ───────────────────────────── */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
