"use client";

import { useAuth } from "@clerk/react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { SidebarFooterLinks } from "@/components/sidebar/_sidebar-footer-links";
import { SidebarNav } from "@/components/sidebar/_sidebar-nav";
import { SidebarUser } from "@/components/sidebar/_sidebar-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { isSignedIn } = useAuth();

  return (
    <Sidebar collapsible="icon" className="p-2" {...props}>
      <SidebarHeader className="gap-2 pb-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Logo size={24} className="shrink-0 text-foreground" />
          <span className="grid group-data-[collapsible=icon]:hidden">
            <span className="font-display text-[15px] font-semibold leading-none text-foreground">
              AgentState
            </span>
            <span className="mt-[3px] font-mono text-[10px] text-faint">state operations</span>
          </span>
        </Link>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent className="gap-1">
        <SidebarNav isSignedIn={isSignedIn ?? false} />
      </SidebarContent>

      <SidebarFooter className="pt-1">
        <SidebarFooterLinks />
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarUser />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
