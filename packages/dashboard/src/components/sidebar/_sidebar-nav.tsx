import {
  ActivityIcon,
  BlocksIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
  SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { label: "Projects", href: "/dashboard", icon: LayoutDashboardIcon },
  { label: "Conversations", href: "/dashboard/conversations", icon: MessageCircleIcon },
  { label: "Analytics", href: "/dashboard/analytics", icon: ActivityIcon },
  { label: "Integrate", href: "/dashboard/integrate", icon: BlocksIcon },
];

interface SidebarNavProps {
  isSignedIn: boolean;
}

export function SidebarNav({ isSignedIn }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel className="px-2 text-[0.68rem] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
          Platform
        </SidebarGroupLabel>
        <SidebarMenu>
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/dashboard/"
                : pathname.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    className={`h-9 rounded-lg px-2.5 ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
                    isActive={isActive}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroup>

      {isSignedIn && (
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[0.68rem] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
            Settings
          </SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/dashboard/settings/organizations">
                <SidebarMenuButton
                  className={`h-9 rounded-lg px-2.5 ${pathname.startsWith("/dashboard/settings/organizations") ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}`}
                  isActive={pathname.startsWith("/dashboard/settings/organizations")}
                  tooltip="Organizations"
                >
                  <SettingsIcon />
                  <span>Organizations</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      )}
    </>
  );
}
