"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const routeMap: Record<string, { label: string; parent?: { href: string; label: string } }> = {
  "/dashboard": { label: "Projects" },
  "/dashboard/conversations": {
    label: "Conversations",
    parent: { href: "/dashboard", label: "Dashboard" },
  },
  "/dashboard/analytics": {
    label: "Analytics",
    parent: { href: "/dashboard", label: "Dashboard" },
  },
  "/dashboard/integrate": {
    label: "Integrate",
    parent: { href: "/dashboard", label: "Dashboard" },
  },
  "/dashboard/project": {
    label: "Project",
    parent: { href: "/dashboard", label: "Dashboard" },
  },
  "/dashboard/domains": {
    label: "Domains",
    parent: { href: "/dashboard", label: "Dashboard" },
  },
  "/dashboard/settings/organizations": {
    label: "Organizations",
    parent: { href: "/dashboard", label: "Settings" },
  },
  "/dashboard/settings/organizations/create": {
    label: "Create",
    parent: { href: "/dashboard/settings/organizations", label: "Organizations" },
  },
  "/dashboard/settings/organizations/members": {
    label: "Members",
    parent: { href: "/dashboard/settings/organizations", label: "Organizations" },
  },
};

export function SiteHeader() {
  const pathname = usePathname();
  const route = routeMap[pathname] || { label: "Dashboard" };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            {route.parent && (
              <>
                <BreadcrumbItem className="hidden md:block">
                  <Link
                    href={route.parent.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {route.parent.label}
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{route.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
