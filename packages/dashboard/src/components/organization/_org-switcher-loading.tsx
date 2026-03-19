import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar-menu";
import { OrganizationIcon } from "./_organization-icon";

export function OrgSwitcherLoading() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" disabled aria-busy="true">
          <OrganizationIcon size="md" variant="muted" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Loading organizations...</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
