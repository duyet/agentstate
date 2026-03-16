"use client";

import { SignInButton, UserButton, useAuth, useUser } from "@clerk/react";
import {
  BarChart3Icon,
  BookOpenIcon,
  ExternalLinkIcon,
  FolderIcon,
  MessageSquareIcon,
  MoonIcon,
  PlugIcon,
  SunIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

function ThemeToggleIcon() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.theme = next ? "dark" : "light";
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}

const navItems = [
  { label: "Projects", href: "/dashboard", icon: FolderIcon },
  { label: "Conversations", href: "/dashboard/conversations", icon: MessageSquareIcon },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3Icon },
  { label: "Integrate", href: "/dashboard/integrate", icon: PlugIcon },
  { label: "Docs", href: "/dashboard/docs", icon: BookOpenIcon },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/dashboard">
              <SidebarMenuButton size="lg" tooltip="AgentState">
                <div className="flex aspect-square size-8 items-center justify-center shrink-0 text-primary">
                  <svg viewBox="0 0 32 32" fill="none" className="size-8">
                    <title>AgentState logo</title>
                    <rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" />
                    <g stroke="white" strokeWidth="1.8" strokeLinecap="round">
                      <line x1="9" y1="11" x2="19" y2="11" />
                      <line x1="13" y1="16" x2="23" y2="16" />
                      <line x1="9" y1="21" x2="17" y2="21" />
                    </g>
                    <circle cx="23" cy="21" r="2" fill="#22c55e" />
                  </svg>
                </div>
                <span className="font-semibold text-sm truncate">AgentState</span>
              </SidebarMenuButton>
            </Link>
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
                  : pathname.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <Link href={item.href}>
                    <SidebarMenuButton isActive={isActive} tooltip={item.label}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" target="_blank">
              <SidebarMenuButton tooltip="agentstate.app">
                <ExternalLinkIcon />
                <span>agentstate.app</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          {isLoaded && (
            <SidebarMenuItem>
              {isSignedIn ? (
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <UserButton />
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-tight">
                      {user?.fullName || "Account"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate leading-tight">
                      {user?.primaryEmailAddress?.emailAddress || ""}
                    </p>
                  </div>
                  <div className="shrink-0 group-data-[collapsible=icon]:hidden">
                    <ThemeToggleIcon />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <SignInButton>
                    <Button size="sm" variant="outline" className="flex-1 text-xs">
                      Sign in
                    </Button>
                  </SignInButton>
                  <div className="shrink-0">
                    <ThemeToggleIcon />
                  </div>
                </div>
              )}
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
