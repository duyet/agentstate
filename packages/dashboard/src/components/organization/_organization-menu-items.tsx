import { CheckIcon } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
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
        <DropdownMenuItem
          key={org.id}
          onClick={() => setActive?.({ organization: org.id })}
          className="gap-2"
          aria-label={org.name}
          aria-selected={activeOrgId === org.id}
        >
          <OrganizationIcon size="sm" />
          <span className="flex-1 truncate">{org.name}</span>
          {activeOrgId === org.id && (
            <CheckIcon className="size-4 shrink-0 ml-auto" aria-label="Selected" />
          )}
        </DropdownMenuItem>
      ))}
    </>
  );
}
