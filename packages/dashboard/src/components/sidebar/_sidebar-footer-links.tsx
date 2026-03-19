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
          <SidebarMenuButton isActive={pathname.startsWith("/docs")} tooltip="Docs">
            <BookOpenIcon />
            <span>Docs</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <Link href="/">
          <SidebarMenuButton isActive={pathname === "/"} tooltip="Home">
            <HomeIcon />
            <span>Home</span>
          </SidebarMenuButton>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
