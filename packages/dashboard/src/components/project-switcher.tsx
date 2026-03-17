"use client";

import type { ProjectListItem } from "@agentstate/shared";
import { Check, ChevronsUpDown, FolderIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { api } from "@/lib/api";

function ProjectSwitcherInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projects, setProjects] = React.useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const currentSlug = pathname.includes("/dashboard/project") ? searchParams.get("slug") : null;

  const currentProject = projects.find((p) => p.slug === currentSlug) ?? null;

  React.useEffect(() => {
    const controller = new AbortController();
    api<{ data: ProjectListItem[] }>("/v1/projects", { signal: controller.signal })
      .then((res) => setProjects(res.data))
      .catch((err) => {
        if (err?.name !== "AbortError") setProjects([]);
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shrink-0">
                <FolderIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">
                  {isLoading ? "Loading..." : (currentProject?.name ?? "Select project")}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {currentProject?.slug ?? ""}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4}>
            {projects.length === 0 && !isLoading ? (
              <DropdownMenuItem disabled>No projects found</DropdownMenuItem>
            ) : (
              projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => router.push(`/dashboard/project/?slug=${project.slug}`)}
                  className="gap-2"
                >
                  <FolderIcon className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{project.name}</span>
                  {currentProject?.id === project.id && (
                    <Check className="size-4 shrink-0 ml-auto" />
                  )}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function ProjectSwitcher() {
  return (
    <React.Suspense>
      <ProjectSwitcherInner />
    </React.Suspense>
  );
}
