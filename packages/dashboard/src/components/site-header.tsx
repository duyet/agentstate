"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pill } from "@/components/brand/bits";
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

const dashboardApiEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT || "agentstate.app/api";

export function SiteHeader() {
  const pathname = usePathname();
  const route = routeMap[pathname] || { label: "Dashboard" };

  return (
    <header className="sticky top-0 z-30 flex h-13 shrink-0 items-center border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="flex w-full items-center gap-2 px-4 sm:px-6">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="mr-2 hidden h-4 sm:block" />

        <Breadcrumb>
          <BreadcrumbList>
            {route.parent && (
              <>
                <BreadcrumbItem>
                  <Link
                    href={route.parent.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {route.parent.label}
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{route.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-2">
          <Pill className="hidden py-[3px] sm:inline-flex">
            <span className="size-2 rounded-full bg-brand" />
            Live
          </Pill>
          <code className="hidden font-mono text-[11px] text-faint lg:block">
            {dashboardApiEndpoint}
          </code>
        </div>
      </div>
    </header>
  );
}
