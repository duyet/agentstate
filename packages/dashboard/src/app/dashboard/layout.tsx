"use client"

import * as React from "react"
import { useAuth, SignInButton } from "@clerk/react"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth()

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4 bg-background">
        <p className="text-sm text-muted-foreground">Sign in to access the dashboard</p>
        <SignInButton>
          <Button>Sign in</Button>
        </SignInButton>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground font-mono">Dashboard</span>
        </header>
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
