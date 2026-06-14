"use client";

import { Sidebar } from "@cloudflare/kumo";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";

interface NavItem {
  title: string;
  url: string;
  icon: PhosphorIcon;
}

export function NavSecondary({
  items,
  ...props
}: {
  items: NavItem[];
} & React.ComponentProps<typeof Sidebar.Group>) {
  const pathname = usePathname();

  return (
    <Sidebar.Group {...props}>
      <Sidebar.Menu>
        {items.map((item) => {
          const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
          return (
            <Sidebar.MenuItem key={item.title}>
              <Sidebar.MenuButton
                size="sm"
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
  );
}
