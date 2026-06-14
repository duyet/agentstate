"use client";

import { CaretUpDown } from "@phosphor-icons/react";
import { DropdownMenu, Sidebar } from "@cloudflare/kumo";
import { OrganizationIcon } from "./_organization-icon";

interface OrgSwitcherTriggerProps {
  orgName: string | null | undefined;
  hasOrg: boolean;
}

export function OrgSwitcherTrigger({ orgName, hasOrg }: OrgSwitcherTriggerProps) {
  return (
    <DropdownMenu.Trigger render={<Sidebar.MenuButton aria-label="Switch organization" />}>
      <OrganizationIcon size="md" />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">{orgName ?? "Select organization"}</span>
        <span className="truncate text-xs text-muted-foreground">
          {hasOrg ? "Active organization" : "No organization selected"}
        </span>
      </div>
      <CaretUpDown className="ml-auto size-4 shrink-0" aria-hidden="true" />
    </DropdownMenu.Trigger>
  );
}
