"use client";

import { useAuth } from "@clerk/react";
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
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrganizationSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarNav isSignedIn={isSignedIn ?? false} />
      </SidebarContent>

      <SidebarFooter>
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
