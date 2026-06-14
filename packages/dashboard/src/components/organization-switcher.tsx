"use client";

import { useOrganization, useUser } from "@clerk/react";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
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
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <OrgSwitcherTrigger orgName={activeOrg?.name} hasOrg={!!activeOrg} />
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="min-w-[200px]"
            aria-label="Organization menu"
          >
            <OrganizationMenuItems
              organizations={organizations}
              activeOrgId={activeOrg?.id}
              setActive={setActive ?? undefined}
            />
            {organizations.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings/organizations/create")}
              aria-label="Create new organization"
            >
              <PlusIcon aria-hidden="true" />
              <span>Create organization</span>
              <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
