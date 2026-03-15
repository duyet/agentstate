"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Projects", href: "/dashboard" },
  { label: "Integrate", href: "/dashboard/integrate" },
  { label: "Docs", href: "/dashboard/docs" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border px-6 py-0">
        <div className="max-w-4xl mx-auto flex items-center gap-0">
          <Link
            href="/"
            className="font-mono font-semibold text-sm tracking-tight mr-8 py-4 text-foreground hover:text-muted-foreground transition-colors shrink-0"
          >
            AgentState
          </Link>
          <nav className="flex items-center">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard" || pathname === "/dashboard/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-4 text-sm border-b-2 transition-colors ${
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
