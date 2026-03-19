"use client";

import { useOrganization, useUser } from "@clerk/react";
import { Building2Icon, CheckIcon, ChevronsUpDownIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useOrganizationsList } from "@/hooks/_use-organizations-list";

export function OrganizationSwitcher() {
  const router = useRouter();
  const { isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { organizations, isLoaded: isOrgListLoaded, setActive } = useOrganizationsList();
  const { organization: activeOrg } = useOrganization();

  if (!isUserLoaded || !isOrgListLoaded) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled aria-busy="true">
            <div
              className="flex aspect-square size-8 items-center justify-center shrink-0 text-muted-foreground"
              aria-hidden="true"
            >
              <Building2Icon />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">Loading organizations...</span>
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
                aria-label="Switch organization"
              />
            }
          >
            <div
              className="flex aspect-square size-8 items-center justify-center shrink-0 text-primary"
              aria-hidden="true"
            >
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
            <ChevronsUpDownIcon className="ml-auto size-4 shrink-0" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={4}
            className="min-w-[200px]"
            aria-label="Organization menu"
          >
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => setActive?.({ organization: org.id })}
                className="gap-2"
                aria-label={org.name}
                aria-selected={activeOrg?.id === org.id}
              >
                <div
                  className="flex aspect-square size-4 items-center justify-center shrink-0 text-primary"
                  aria-hidden="true"
                >
                  <Building2Icon />
                </div>
                <span className="flex-1 truncate">{org.name}</span>
                {activeOrg?.id === org.id && (
                  <CheckIcon className="size-4 shrink-0 ml-auto" aria-label="Selected" />
                )}
              </DropdownMenuItem>
            ))}
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
