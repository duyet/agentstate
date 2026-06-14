"use client";

import { SignIn, useAuth } from "@clerk/react";
import { Loader, SidebarProvider } from "@cloudflare/kumo";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
