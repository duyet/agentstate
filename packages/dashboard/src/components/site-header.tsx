"use client";

import { Breadcrumbs, Sidebar } from "@cloudflare/kumo";
import { usePathname } from "next/navigation";

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
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <Sidebar.Trigger />
        <Breadcrumbs>
          {route.parent && (
            <>
              <Breadcrumbs.Link href={route.parent.href}>{route.parent.label}</Breadcrumbs.Link>
              <Breadcrumbs.Separator />
            </>
          )}
          <Breadcrumbs.Current>{route.label}</Breadcrumbs.Current>
        </Breadcrumbs>
      </div>
    </header>
  );
}
