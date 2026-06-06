"use client";

import { SignIn, useAuth, useClerk, useUser } from "@clerk/react";
import { ChevronsUpDown, LogOut, Settings, UserIcon } from "lucide-react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { Pill } from "@/components/brand/bits";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const dashboardApiEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || "agentstate.app/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

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

  const userInitial =
    user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U";
  const displayName =
    user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Account";

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

          {/* Right side: endpoint badge + user menu */}
          <div className="flex items-center gap-2">
            <code className="hidden font-mono text-[11px] text-faint lg:block">
              {dashboardApiEndpoint}
            </code>

            {/* ── User dropdown ─────────────────────── */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                  />
                }
              >
                <div className="flex size-7 items-center justify-center rounded-full bg-brand-soft">
                  <span className="text-[11px] font-semibold text-brand">{userInitial}</span>
                </div>
                <span className="hidden font-medium sm:inline">{displayName}</span>
                <ChevronsUpDown className="size-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{user?.fullName || "Account"}</span>
                    <span className="text-xs text-muted-foreground">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/dashboard" />}>
                  <UserIcon className="size-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/dashboard/settings/organizations" />}>
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm">Theme</span>
                  <ThemeToggle />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => signOut()}
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Main content ───────────────────────────── */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
