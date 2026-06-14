"use client";

import { useAuth } from "@clerk/react";
import {
  ActivityIcon,
  BlocksIcon,
  BookOpenIcon,
  GitBranchIcon,
  HomeIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
  SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { NavMain } from "@/components/sidebar/nav-main";
import { NavSecondary } from "@/components/sidebar/nav-secondary";
import { NavUser } from "@/components/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "Platform",
    items: [
      { title: "Projects", url: "/dashboard", icon: LayoutDashboardIcon },
      { title: "Conversations", url: "/dashboard/conversations", icon: MessageCircleIcon },
      { title: "Traces", url: "/dashboard/traces", icon: GitBranchIcon },
      { title: "Analytics", url: "/dashboard/analytics", icon: ActivityIcon },
      { title: "Integrate", url: "/dashboard/integrate", icon: BlocksIcon },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Organizations", url: "/dashboard/settings/organizations", icon: SettingsIcon },
    ],
  },
];

const secondaryItems = [
  { title: "Docs", url: "/docs", icon: BookOpenIcon },
  { title: "Home", url: "/", icon: HomeIcon },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { isSignedIn } = useAuth();

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="AgentState" render={<Link href="/dashboard" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Logo size={16} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">AgentState</span>
                <span className="truncate text-xs">state operations</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <NavMain groups={isSignedIn ? navGroups : [navGroups[0]]} />
        <NavSecondary items={secondaryItems} className="mt-auto" />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
