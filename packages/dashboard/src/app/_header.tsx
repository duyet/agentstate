"use client";

import { Button } from "@cloudflare/kumo/components/button";
import { ArrowUpRight } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopbarAuth } from "@/components/topbar-auth";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Docs", href: "/docs" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Brand", href: "/brand" },
] as const;

export function Header() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || (pathname?.startsWith(`${href}/`) ?? false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="AgentState home">
          <Wordmark size={26} />
        </Link>

        <nav className="flex items-center gap-1">
          <div className="mr-1 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-md px-3 py-[7px] font-display text-sm transition-colors",
                  isActive(n.href)
                    ? "bg-bg-deep font-semibold text-foreground"
                    : "font-medium text-ink-2 hover:bg-bg-deep",
                )}
              >
                {n.label}
              </Link>
            ))}
          </div>

          {/* biome-ignore lint/a11y/useAnchorContent: wrapping Button yields clickable content. */}
          <a
            href="https://github.com/duyet/agentstate"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex"
          >
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              GitHub
              <ArrowUpRight size={16} />
            </Button>
          </a>

          <ThemeToggle className="size-8 text-muted-foreground hover:text-foreground" />

          <Link href="/dashboard" className="hidden sm:inline-flex">
            <Button variant="primary" size="sm">
              Open dashboard
            </Button>
          </Link>

          <TopbarAuth />
        </nav>
      </div>
    </header>
  );
}
