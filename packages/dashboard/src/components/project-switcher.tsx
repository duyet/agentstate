"use client";

import type { ProjectListItem } from "@agentstate/shared";
import { Check, ChevronsUpDown } from "lucide-react";
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

const AgentStateLogo = ({ size = "size-8" }: { size?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={size} aria-hidden="true" focusable="false">
    <rect x="2" y="2" width="28" height="28" rx="7" fill="currentColor" />
    <g stroke="white" strokeWidth="1.8" strokeLinecap="round">
      <line x1="9" y1="11" x2="19" y2="11" />
      <line x1="13" y1="16" x2="23" y2="16" />
      <line x1="9" y1="21" x2="17" y2="21" />
    </g>
    <circle cx="23" cy="21" r="2" fill="hsl(var(--accent))" />
  </svg>
);

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
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center shrink-0 text-primary">
              <AgentStateLogo />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">Agent State</span>
              <span className="truncate text-xs text-muted-foreground">
                {currentProject?.name ?? "Select project"}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
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
                  <div className="flex aspect-square size-4 items-center justify-center shrink-0 text-primary">
                    <AgentStateLogo size="size-4" />
                  </div>
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
