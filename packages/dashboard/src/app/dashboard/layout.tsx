"use client";

import { SignIn, useAuth } from "@clerk/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
      <AppSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background/95 px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">AgentState</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Conversation memory operations
              </p>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Live
            </Badge>
          </div>
          <code className="hidden rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground lg:block">
            {dashboardApiEndpoint}
          </code>
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
