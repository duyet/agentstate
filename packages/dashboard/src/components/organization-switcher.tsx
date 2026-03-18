"use client";

import { useOrganization, useOrganizationList, useUser } from "@clerk/react";
import { Building2Icon, CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function OrganizationSwitcher() {
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const {
    isLoaded: isOrgListLoaded,
    userMemberships,
    setActive,
  } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });
  const { organization: activeOrg } = useOrganization();

  // Extract organizations from user memberships, filtering out undefined
  const organizations =
    userMemberships?.data
      ?.map((m) => m.organization)
      .filter((org): org is NonNullable<typeof org> => org != null) ?? [];

  if (!isUserLoaded || !isOrgListLoaded) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center shrink-0 text-muted-foreground">
              <Building2Icon />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Loading...</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center shrink-0 text-primary">
              <Building2Icon />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {activeOrg?.name ?? "Select organization"}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {activeOrg ? "Active organization" : "No organization selected"}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4} className="min-w-[200px]">
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => setActive?.({ organization: org.id })}
                className="gap-2"
              >
                <div className="flex aspect-square size-4 items-center justify-center shrink-0 text-primary">
                  <Building2Icon />
                </div>
                <span className="flex-1 truncate">{org.name}</span>
                {activeOrg?.id === org.id && <CheckIcon className="size-4 shrink-0 ml-auto" />}
              </DropdownMenuItem>
            ))}
            {organizations.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => window.location.assign("/dashboard/settings/organizations/create")}
            >
              <PlusIcon />
              <span>Create organization</span>
              <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
