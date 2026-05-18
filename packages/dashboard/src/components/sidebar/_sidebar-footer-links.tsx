import { BookOpenIcon, HomeIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function SidebarFooterLinks() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link href="/docs">
          <SidebarMenuButton
            className="h-9 rounded-lg px-2.5 data-active:bg-sidebar-accent data-active:shadow-sm data-active:ring-1 data-active:ring-sidebar-border"
            isActive={pathname.startsWith("/docs")}
            tooltip="Docs"
          >
            <BookOpenIcon />
            <span>Docs</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <Link href="/">
          <SidebarMenuButton
            className="h-9 rounded-lg px-2.5 data-active:bg-sidebar-accent data-active:shadow-sm data-active:ring-1 data-active:ring-sidebar-border"
            isActive={pathname === "/"}
            tooltip="Home"
          >
            <HomeIcon />
            <span>Home</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
