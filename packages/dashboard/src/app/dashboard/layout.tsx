"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, SignInButton, UserButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProjectsIcon, IntegrateIcon, DocsIcon } from "@/components/icons";

const navItems = [
  { label: "Projects", href: "/dashboard", icon: ProjectsIcon },
  { label: "Integrate", href: "/dashboard/integrate", icon: IntegrateIcon },
  { label: "Docs", href: "/dashboard/docs", icon: DocsIcon },
];

function AuthControls() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return <UserButton />;
  }

  return (
    <SignInButton>
      <Button size="sm" variant="outline" className="font-mono text-xs w-full">
        Sign in
      </Button>
    </SignInButton>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4 bg-background">
        <p className="text-sm text-muted-foreground">
          Sign in to access the dashboard
        </p>
        <SignInButton>
          <Button>Sign in</Button>
        </SignInButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-border">
          <Link
            href="/"
            className="font-mono text-sm font-semibold tracking-tight text-foreground hover:text-muted-foreground transition-colors"
          >
            AgentState
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/dashboard/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <Icon className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: theme + auth */}
        <div className="px-3 py-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <AuthControls />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
