"use client";

import { SignIn, useAuth, useUser } from "@clerk/react";
import {
  BookOpen,
  ChartLine,
  ChatCircle,
  Gear,
  GitBranch,
  House,
  type Icon as PhosphorIcon,
  Plug,
  SquaresFour,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/logo-mark";

interface NavItem {
  title: string;
  url: string;
  icon: PhosphorIcon;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { title: "Projects", url: "/dashboard", icon: SquaresFour },
      { title: "Conversations", url: "/dashboard/conversations", icon: ChatCircle },
      { title: "Traces", url: "/dashboard/traces", icon: GitBranch },
      { title: "Analytics", url: "/dashboard/analytics", icon: ChartLine },
      { title: "Integrate", url: "/dashboard/integrate", icon: Plug },
    ],
  },
  {
    label: "Settings",
    items: [{ title: "Organizations", url: "/dashboard/settings/organizations", icon: Gear }],
  },
];
const secondaryItems: NavItem[] = [
  { title: "Docs", url: "/docs", icon: BookOpen },
  { title: "Home", url: "/", icon: House },
];

function useActivePath() {
  // lightweight pathname hook (next/navigation is shimmed to the same in the Astro port)
  const [pathname, setPathname] = useStatePath();
  return pathname;
}

// avoid importing the shim name indirectly; tiny local hook
import { useEffect, useState } from "react";
function useStatePath() {
  const [p, setP] = useState(() => (typeof window === "undefined" ? "" : window.location.pathname));
  useEffect(() => {
    const onChange = () => setP(window.location.pathname);
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);
  return p;
}

function isActive(pathname: string, url: string) {
  if (url === "/dashboard") return pathname === "/dashboard" || pathname === "/dashboard/";
  return pathname.startsWith(url);
}

function NavList({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  return (
    <nav className="flex flex-col gap-5 px-3">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="px-2 pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-4">
            {g.label}
          </div>
          <div className="space-y-0.5">
            {g.items.map((it) => {
              const active = isActive(pathname, it.url);
              const Icon = it.icon;
              return (
                <a
                  key={it.url}
                  href={it.url}
                  className={`flex min-h-[36px] items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-[14px] transition-[background-color,color] duration-150 ${
                    active
                      ? "bg-panel2 text-fg"
                      : "text-fg-3 hover:bg-panel2 hover:text-fg"
                  }`}
                >
                  <Icon size={16} weight={active ? "fill" : "regular"} />
                  <span>{it.title}</span>
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-base">
        <div className="size-5 animate-spin rounded-full border-2 border-edge border-t-fg-4" />
      </div>
    );
  }
  if (!isSignedIn) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-base px-4">
        <SignIn routing="hash" />
      </div>
    );
  }
  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useActivePath();
  const { user } = useUser();

  return (
    <Gate>
      <div className="flex min-h-[100dvh] bg-base">
        {/* sidebar */}
        <aside className="hidden w-[244px] shrink-0 border-r border-edge lg:flex lg:flex-col">
          <div className="flex h-14 items-center gap-2.5 border-b border-edge-soft px-5">
            <a href="/dashboard" className="flex items-center gap-2 text-fg">
              <LogoMark size={20} />
              <span className="text-[14.5px] font-semibold tracking-tight">AgentState</span>
            </a>
          </div>
          <div className="flex-1 overflow-auto py-4">
            <NavList groups={navGroups} pathname={pathname} />
            <div className="mx-3 mt-5 border-t border-edge-soft pt-3">
              <NavList groups={[{ label: "", items: secondaryItems }]} pathname={pathname} />
            </div>
          </div>
        </aside>

        {/* main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-edge bg-base/85 px-5 backdrop-blur sm:px-7">
            <Breadcrumb pathname={pathname} />
            <div className="ml-auto flex items-center gap-2">
              {user && (
                <span className="hidden text-[13px] text-fg-3 sm:inline">{user.fullName ?? user.primaryEmailAddress?.emailAddress}</span>
              )}
              <span className="grid size-8 place-items-center rounded-full bg-panel2 font-mono text-[12px] text-fg">
                {(user?.firstName ?? "U").slice(0, 1).toUpperCase()}
              </span>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </Gate>
  );
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const seg = pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const tail = seg.length > 1 ? seg[seg.length - 1] : seg[0] ?? "";
  return (
    <span className="font-mono text-[13px] text-fg-4">
      <span className="text-fg-4">agentstate</span>
      <span className="px-1.5 text-edge">/</span>
      <span className="text-fg-2">{tail || "dashboard"}</span>
    </span>
  );
}
