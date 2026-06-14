"use client";

import { useAuth } from "@clerk/react";
import { Sidebar } from "@cloudflare/kumo";
import {
  BookOpen,
  ChartLine,
  ChatCircle,
  Gear,
  GitBranch,
  House,
  type Icon as PhosphorIcon,
  Plug,
  SquaresFour,
} from "@phosphor-icons/react";
import { Logo } from "@/components/brand/logo";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { NavMain } from "@/components/sidebar/nav-main";
import { NavSecondary } from "@/components/sidebar/nav-secondary";
import { NavUser } from "@/components/sidebar/nav-user";

interface NavItem {
  title: string;
  url: string;
  icon: PhosphorIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { title: "Projects", url: "/dashboard", icon: SquaresFour },
      { title: "Conversations", url: "/dashboard/conversations", icon: ChatCircle },
      { title: "Traces", url: "/dashboard/traces", icon: GitBranch },
      { title: "Analytics", url: "/dashboard/analytics", icon: ChartLine },
      { title: "Integrate", url: "/dashboard/integrate", icon: Plug },
    ],
  },
  {
    label: "Settings",
    items: [{ title: "Organizations", url: "/dashboard/settings/organizations", icon: Gear }],
  },
];

const secondaryItems: NavItem[] = [
  { title: "Docs", url: "/docs", icon: BookOpen },
  { title: "Home", url: "/", icon: House },
];

export function AppSidebar() {
  const { isSignedIn } = useAuth();

  return (
    <Sidebar>
      <Sidebar.Header>
        <Sidebar.Menu>
          <Sidebar.MenuItem>
            <Sidebar.MenuButton href="/dashboard" aria-label="AgentState home">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Logo size={16} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">AgentState</span>
                <span className="truncate text-xs">state operations</span>
              </div>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        </Sidebar.Menu>
        <OrganizationSwitcher />
      </Sidebar.Header>

      <Sidebar.Content>
        <NavMain groups={isSignedIn ? navGroups : [navGroups[0]]} />
        <NavSecondary items={secondaryItems} className="mt-auto" />
      </Sidebar.Content>

      <Sidebar.Footer>
        <NavUser />
      </Sidebar.Footer>

      <Sidebar.Rail />
    </Sidebar>
  );
}
