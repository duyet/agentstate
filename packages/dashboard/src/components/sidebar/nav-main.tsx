"use client";

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Sidebar } from "@cloudflare/kumo";
import { usePathname } from "next/navigation";

interface NavItem {
  title: string;
  url: string;
  icon: PhosphorIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <>
      {groups.map((group) => (
        <Sidebar.Group key={group.label}>
          <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
          <Sidebar.Menu>
            {group.items.map((item) => {
              const isActive =
                item.url === "/dashboard"
                  ? pathname === "/dashboard" || pathname === "/dashboard/"
                  : pathname.startsWith(item.url);
              return (
                <Sidebar.MenuItem key={item.url}>
                  <Sidebar.MenuButton
                    icon={item.icon}
                    active={isActive}
                    href={item.url}
                    tooltip={item.title}
                  >
                    {item.title}
                  </Sidebar.MenuButton>
                </Sidebar.MenuItem>
              );
            })}
          </Sidebar.Menu>
        </Sidebar.Group>
      ))}
    </>
  );
}
