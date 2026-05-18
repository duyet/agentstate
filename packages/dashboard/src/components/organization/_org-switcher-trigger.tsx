import { ChevronsUpDownIcon } from "lucide-react";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenuButton } from "@/components/ui/sidebar-menu";
import { OrganizationIcon } from "./_organization-icon";

interface OrgSwitcherTriggerProps {
  orgName: string | null | undefined;
  hasOrg: boolean;
}

export function OrgSwitcherTrigger({ orgName, hasOrg }: OrgSwitcherTriggerProps) {
  return (
    <DropdownMenuTrigger
      render={
        <SidebarMenuButton
          size="lg"
          className="h-12 rounded-xl bg-sidebar-accent/65 px-2.5 shadow-sm ring-1 ring-sidebar-border data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          aria-label="Switch organization"
        />
      }
    >
      <OrganizationIcon size="md" />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">{orgName ?? "Select organization"}</span>
        <span className="truncate text-xs text-muted-foreground">
          {hasOrg ? "Active organization" : "No organization selected"}
        </span>
      </div>
      <ChevronsUpDownIcon className="ml-auto size-4 shrink-0" aria-hidden="true" />
    </DropdownMenuTrigger>
  );
}
