"use client";

import { useAuth } from "@clerk/react";
import {
  ActivityIcon,
  BlocksIcon,
  BookOpenIcon,
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
    <Sidebar collapsible="icon" className="p-2" {...props}>
      <SidebarHeader className="gap-2 pb-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="AgentState"
              className="p-1.5!"
              render={<Link href="/dashboard" className="flex items-center gap-2.5" />}
            >
              <Logo size={24} className="shrink-0 text-foreground" />
              <span className="grid group-data-[collapsible=icon]:hidden">
                <span className="font-display text-[15px] font-semibold leading-none text-foreground">
                  AgentState
                </span>
                <span className="mt-[3px] font-mono text-[10px] text-faint">state operations</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent className="gap-1">
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
