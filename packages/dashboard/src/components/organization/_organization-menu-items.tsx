"use client";

import { DropdownMenu } from "@cloudflare/kumo";
import { Check } from "@phosphor-icons/react";
import type { UseOrganizationsListResult } from "@/hooks/_use-organizations-list";
import { OrganizationIcon } from "./_organization-icon";

interface OrganizationMenuItemsProps {
  organizations: UseOrganizationsListResult["organizations"];
  activeOrgId: string | null | undefined;
  setActive: UseOrganizationsListResult["setActive"];
}

export function OrganizationMenuItems({
  organizations,
  activeOrgId,
  setActive,
}: OrganizationMenuItemsProps) {
  return (
    <>
      {organizations.map((org) => (
        <DropdownMenu.Item
          key={org.id}
          onClick={() => setActive?.({ organization: org.id })}
          selected={activeOrgId === org.id}
          aria-label={org.name}
        >
          <OrganizationIcon size="sm" />
          <span className="flex-1 truncate">{org.name}</span>
          {activeOrgId === org.id && (
            <Check className="ml-auto size-4 shrink-0" aria-label="Selected" />
          )}
        </DropdownMenu.Item>
      ))}
    </>
  );
}
