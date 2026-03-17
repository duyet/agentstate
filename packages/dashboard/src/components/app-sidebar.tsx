"use client";

import { SignInButton, UserButton, useAuth, useUser } from "@clerk/react";
import {
  ActivityIcon,
  BlocksIcon,
  BookOpenIcon,
  HomeIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProjectSwitcher } from "@/components/project-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
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
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Projects", href: "/dashboard", icon: LayoutDashboardIcon },
  { label: "Conversations", href: "/dashboard/conversations", icon: MessageCircleIcon },
  { label: "Analytics", href: "/dashboard/analytics", icon: ActivityIcon },
  { label: "Integrate", href: "/dashboard/integrate", icon: BlocksIcon },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ProjectSwitcher />
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
            <Link href="/docs">
              <SidebarMenuButton isActive={pathname.startsWith("/docs")} tooltip="Docs">
                <BookOpenIcon />
                <span>Docs</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/">
              <SidebarMenuButton isActive={pathname === "/"} tooltip="Home">
                <HomeIcon />
                <span>Home</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
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
                    <ThemeToggle size="h-4 w-4" />
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
                    <ThemeToggle size="h-4 w-4" />
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
