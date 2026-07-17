"use client";

import { SignIn, UserButton, useAuth, useUser } from "@clerk/react";
import {
  ArrowUpRight,
  BookOpen,
  CaretDown,
  ChartLine,
  ChatCircle,
  Folder,
  Gear,
  GitBranch,
  House,
  Key,
  List,
  Moon,
  type Icon as PhosphorIcon,
  Plug,
  SquaresFour,
  Sun,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LogoMark } from "@/components/logo-mark";
import { ProjectScopeProvider, useProjectScope } from "@/components/project-scope";
import { SESSION_EXPIRED_EVENT } from "@/lib/api";

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
      { title: "API Keys", url: "/dashboard/keys", icon: Key },
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
  const [pathname] = useStatePath();
  return pathname;
}

function useStatePath() {
  const [p, setP] = useState(() => (typeof window === "undefined" ? "" : window.location.pathname));
  useEffect(() => {
    const onChange = () => setP(window.location.pathname);
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);
  return p;
}

// Primary nav URLs only — used to resolve the single active item via longest-prefix
// match. secondaryItems (Docs/Home) are plain external-style links that are never
// highlighted, so they are intentionally excluded.
const allNavUrls = navGroups.flatMap((g) => g.items.map((i) => i.url));

function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Resolve which nav URL is active for a given pathname using longest-prefix match.
 *
 * A child route (e.g. /dashboard/project) has no nav entry of its own, so it
 * resolves to its closest parent (/dashboard → "Projects"). A deeper exact match
 * (/dashboard/conversations) always beats the shorter /dashboard prefix. The root
 * "/" only matches the root path, never as a prefix of every page.
 */
function resolveActiveUrl(pathname: string): string | null {
  const p = normalizePath(pathname);
  let best: string | null = null;
  let bestLen = -1;
  for (const url of allNavUrls) {
    const u = normalizePath(url);
    const matches = p === u || (u !== "/" && p.startsWith(`${u}/`));
    if (matches && u.length > bestLen) {
      best = url;
      bestLen = u.length;
    }
  }
  return best;
}

function NavList({
  groups,
  activeUrl,
  onNavigate,
}: {
  groups: NavGroup[];
  activeUrl: string | null;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-5 px-3">
      {groups.map((g) => (
        <div key={g.label}>
          <div className="px-2 pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg-4">
            {g.label}
          </div>
          <div className="space-y-0.5">
            {g.items.map((it) => {
              const active = it.url === activeUrl;
              const Icon = it.icon;
              return (
                <a
                  key={it.url}
                  href={it.url}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[36px] items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-[14px] transition-[background-color,color] duration-150 ${
                    active
                      ? "bg-accent/10 font-medium text-accent"
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
  const { isSignedIn, isLoaded, signOut } = useAuth();
  const handledExpiry = useRef(false);

  // A 401 from any API call means the Clerk session expired or is invalid —
  // sign out (which flips isSignedIn to false and re-renders the SignIn
  // branch below) instead of leaving the user staring at a stale page with a
  // generic error toast. Guarded so a burst of concurrent 401s only prompts once.
  useEffect(() => {
    const handleSessionExpired = () => {
      if (handledExpiry.current) return;
      handledExpiry.current = true;
      toast.error("Your session expired. Please sign in again.");
      void signOut().finally(() => {
        handledExpiry.current = false;
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [signOut]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-base" aria-live="polite">
        <div
          className="size-5 animate-spin rounded-full border-2 border-edge border-t-fg-4"
          aria-hidden="true"
        />
        <span className="sr-only">Checking sign-in…</span>
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

/**
 * Secondary links (Docs, Home) leave the dashboard app, so they render as plain
 * muted links with an external-link affordance — never highlighted as active —
 * and are pinned to the bottom of the sidebar.
 */
function SecondaryLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="mx-3 mt-6 border-t border-edge-soft pt-3 pb-1">
      <div className="space-y-0.5">
        {secondaryItems.map((it) => {
          const Icon = it.icon;
          return (
            <a
              key={it.url}
              href={it.url}
              onClick={onNavigate}
              className="group flex min-h-[32px] items-center gap-2.5 rounded-[var(--radius)] px-3 py-1.5 text-[13px] text-fg-4 transition-colors hover:bg-panel2 hover:text-fg-2"
            >
              <Icon size={15} weight="regular" />
              <span>{it.title}</span>
              {/* The ArrowUpRight affordance is aria-hidden, so give screen
                  readers an equivalent cue that this link leaves the app (#324). */}
              <span className="sr-only">(leaves dashboard)</span>
              <ArrowUpRight
                size={12}
                weight="bold"
                className="ml-auto opacity-0 transition-opacity group-hover:opacity-70"
                aria-hidden="true"
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}

function SidebarInner({
  activeUrl,
  onNavigate,
}: {
  activeUrl: string | null;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-auto py-4">
      <NavList groups={navGroups} activeUrl={activeUrl} onNavigate={onNavigate} />
      <div className="mt-auto">
        <SecondaryLinks onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/**
 * SidebarProjectScope — the active-project switcher under the logo. Reads/writes
 * the shared ProjectScope so it controls every project-scoped page at once.
 */
function SidebarProjectScope() {
  const { projects, selectedProjectId, setSelectedProjectId, loadingProjects } = useProjectScope();

  if (loadingProjects) {
    return (
      <div className="border-b border-edge-soft px-3 py-2.5" aria-live="polite">
        <div className="h-9 animate-pulse rounded-[var(--radius)] bg-panel2" aria-hidden="true" />
        <span className="sr-only">Loading projects…</span>
      </div>
    );
  }

  if (projects.length === 0) return null;

  return (
    <div className="border-b border-edge-soft px-3 py-2.5">
      <label htmlFor="sidebar-project-scope" className="sr-only">
        Active project
      </label>
      <div className="relative">
        <Folder
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-4"
          aria-hidden
        />
        <select
          id="sidebar-project-scope"
          aria-label="Active project"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="h-9 w-full appearance-none rounded-[var(--radius)] border border-edge bg-panel pl-8 pr-8 text-[13px] text-fg transition-colors hover:bg-panel2 focus-visible:bg-panel2 focus-visible:outline-none"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <CaretDown
          size={13}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-4"
          aria-hidden
        />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useActivePath();
  const activeUrl = resolveActiveUrl(pathname);
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  // close the mobile drawer on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // lock background scroll while the drawer is open
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  return (
    <Gate>
      <ProjectScopeProvider>
        <div className="flex min-h-[100dvh] bg-base">
          {/* sidebar (desktop) */}
          <aside className="hidden w-[244px] shrink-0 border-r border-edge lg:flex lg:flex-col">
            <div className="flex h-14 items-center gap-2.5 border-b border-edge-soft px-5">
              <a href="/dashboard" className="flex items-center gap-2 text-fg">
                <LogoMark size={20} />
                <span className="text-[14.5px] font-semibold tracking-tight">AgentState</span>
              </a>
            </div>
            <SidebarProjectScope />
            <SidebarInner activeUrl={activeUrl} />
          </aside>

          {/* drawer (mobile) */}
          <div
            className={`fixed inset-0 z-40 lg:hidden ${menuOpen ? "" : "pointer-events-none"}`}
            aria-hidden={!menuOpen}
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className={`absolute inset-0 cursor-default bg-black/50 transition-opacity duration-200 ${
                menuOpen ? "opacity-100" : "opacity-0"
              }`}
            />
            <aside
              className={`absolute left-0 top-0 flex h-full w-[260px] max-w-[82vw] flex-col border-r border-edge bg-base transition-transform duration-200 ${
                menuOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="flex h-14 items-center justify-between gap-2.5 border-b border-edge-soft px-5">
                <a href="/dashboard" className="flex items-center gap-2 text-fg">
                  <LogoMark size={20} />
                  <span className="text-[14.5px] font-semibold tracking-tight">AgentState</span>
                </a>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="grid size-9 place-items-center rounded-[var(--radius)] text-fg-3 transition-[background-color,color,transform] duration-150 hover:bg-panel2 hover:text-fg active:scale-[0.96]"
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarProjectScope />
              <SidebarInner activeUrl={activeUrl} onNavigate={() => setMenuOpen(false)} />
            </aside>
          </div>

          {/* main */}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-edge bg-base/85 px-5 backdrop-blur sm:px-7">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="grid size-9 shrink-0 place-items-center rounded-[var(--radius)] text-fg-3 transition-[background-color,color,transform] duration-150 hover:bg-panel2 hover:text-fg active:scale-[0.96] lg:hidden"
              >
                <List size={18} />
              </button>
              <Breadcrumb pathname={pathname} />
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  aria-label="Toggle color theme"
                  className="relative grid size-9 place-items-center overflow-hidden rounded-[var(--radius)] border border-edge text-fg-3 transition-[background-color,color,transform] duration-150 hover:bg-panel2 hover:text-fg active:scale-[0.96]"
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={theme === "dark" ? "moon" : "sun"}
                      initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                      className="grid place-items-center"
                    >
                      {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
                    </motion.span>
                  </AnimatePresence>
                </button>
                {user && (
                  <span className="hidden text-[13px] text-fg-3 sm:inline">
                    {user.fullName ?? user.primaryEmailAddress?.emailAddress}
                  </span>
                )}
                <UserButton />
              </div>
            </header>
            <main className="flex-1 pt-7 pb-20 lg:pt-8">{children}</main>
          </div>
        </div>
      </ProjectScopeProvider>
    </Gate>
  );
}

function Breadcrumb({ pathname }: { pathname: string }) {
  const seg = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean);
  const tail = seg.length > 1 ? seg[seg.length - 1] : (seg[0] ?? "");
  return (
    <span className="font-mono text-[13px] text-fg-4">
      <span className="text-fg-4">agentstate</span>
      <span className="px-1.5 text-edge">/</span>
      <span className="text-fg-2">{tail || "dashboard"}</span>
    </span>
  );
}
