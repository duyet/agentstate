"use client";

import { Sidebar } from "@cloudflare/kumo";
import { OrganizationIcon } from "./_organization-icon";

export function OrgSwitcherLoading() {
  return (
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <Sidebar.MenuButton disabled aria-busy="true">
          <OrganizationIcon size="md" variant="muted" />
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Loading organizations...</span>
          </div>
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  );
}
