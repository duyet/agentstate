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
    <SidebarProvider className="bg-muted/35">
      <AppSidebar variant="inset" />
      <SidebarInset className="bg-background/95">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/70 sm:px-6">
          <div className="flex items-center gap-2.5">
            <SidebarTrigger className="text-muted-foreground" />
            <Pill className="py-[3px]">
              <span className="size-2 rounded-full bg-brand" />
              Live
            </Pill>
          </div>
          <code className="font-mono text-xs text-faint">{dashboardApiEndpoint}</code>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-7">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
