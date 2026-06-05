"use client";

import Link from "next/link";
import { SidebarMenuButton } from "./sidebar-menu";

interface SidebarMenuLinkProps extends React.ComponentProps<typeof Link> {
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<typeof SidebarMenuButton>;
  className?: string;
}

export function SidebarMenuLink({
  href,
  isActive = false,
  tooltip,
  children,
  className,
  ...props
}: SidebarMenuLinkProps) {
  return (
    <Link href={href} className="block" {...props}>
      <SidebarMenuButton
        className={className}
        isActive={isActive}
        tooltip={tooltip}
      >
        {children}
      </SidebarMenuButton>
    </Link>
  );
}
