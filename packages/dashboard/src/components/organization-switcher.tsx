"use client";

import { useOrganization, useUser } from "@clerk/react";
import { Plus } from "@phosphor-icons/react";
import { DropdownMenu, Sidebar } from "@cloudflare/kumo";
import { useRouter } from "next/navigation";
import { useOrganizationsList } from "@/hooks/_use-organizations-list";
import { OrgSwitcherLoading } from "./organization/_org-switcher-loading";
import { OrgSwitcherTrigger } from "./organization/_org-switcher-trigger";
import { OrganizationMenuItems } from "./organization/_organization-menu-items";

export function OrganizationSwitcher() {
  const router = useRouter();
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { organizations, isLoaded: isOrgListLoaded, setActive } = useOrganizationsList();
  const { organization: activeOrg } = useOrganization();

  if (!isUserLoaded || !isOrgListLoaded) {
    return <OrgSwitcherLoading />;
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <Sidebar.Menu>
      <Sidebar.MenuItem>
        <DropdownMenu>
          <OrgSwitcherTrigger orgName={activeOrg?.name} hasOrg={!!activeOrg} />
          <DropdownMenu.Content
            sideOffset={4}
            className="min-w-[200px]"
            aria-label="Organization menu"
          >
            <OrganizationMenuItems
              organizations={organizations}
              activeOrgId={activeOrg?.id}
              setActive={setActive ?? undefined}
            />
            {organizations.length > 0 && <DropdownMenu.Separator />}
            <DropdownMenu.Item
              icon={Plus}
              onClick={() => router.push("/dashboard/settings/organizations/create")}
              aria-label="Create new organization"
            >
              Create organization
              <DropdownMenu.Shortcut>⌘N</DropdownMenu.Shortcut>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </Sidebar.MenuItem>
    </Sidebar.Menu>
  );
}
