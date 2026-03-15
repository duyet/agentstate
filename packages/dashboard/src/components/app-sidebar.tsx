"use client"

import * as React from "react"
import { useAuth, UserButton, SignInButton } from "@clerk/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { FolderIcon, PlugIcon, BookOpenIcon, ExternalLinkIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { isSignedIn, isLoaded } = useAuth()

  const navItems = [
    { label: "Projects", href: "/dashboard", icon: FolderIcon },
    { label: "Integrate", href: "/dashboard/integrate", icon: PlugIcon },
    { label: "Docs", href: "/dashboard/docs", icon: BookOpenIcon },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={
                <Link href="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <span className="font-mono text-xs font-bold">AS</span>
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-sm">AgentState</span>
                  </div>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard" || pathname === "/dashboard/"
                  : pathname.startsWith(item.href)
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.label}
                    render={
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Home"
              render={
                <Link href="/" target="_blank">
                  <ExternalLinkIcon />
                  <span>agentstate.app</span>
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Theme</span>
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            {isLoaded && isSignedIn ? (
              <div className="px-2 py-1">
                <UserButton />
              </div>
            ) : isLoaded ? (
              <SignInButton>
                <Button size="sm" variant="outline" className="w-full text-xs">Sign in</Button>
              </SignInButton>
            ) : null}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
