"use client";

import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TopbarAuth } from "@/components/topbar-auth";
import { Button } from "@/components/ui/button";
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

          <Button
            variant="ghost"
            size="sm"
            className="hidden text-muted-foreground sm:inline-flex"
            nativeButton={false}
            // biome-ignore lint/a11y/useAnchorContent: Base UI injects children into this render anchor.
            render={
              <a href="https://github.com/duyet/agentstate" target="_blank" rel="noreferrer" />
            }
          >
            GitHub
            <ArrowUpRightIcon data-icon="inline-end" />
          </Button>

          <ThemeToggle className="size-8 text-muted-foreground hover:text-foreground" />

          <Button
            variant="brand"
            size="sm"
            className="hidden sm:inline-flex"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            Open dashboard
          </Button>

          <TopbarAuth />
        </nav>
      </div>
    </header>
  );
}
