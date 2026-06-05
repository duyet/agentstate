import Link from "next/link";
import { MonoLabel } from "@/components/brand/bits";
import { Wordmark } from "@/components/brand/logo";

type FootLink = { label: string; href: string; external?: boolean };

const PRODUCT: FootLink[] = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Docs", href: "/docs" },
  { label: "Brand", href: "/brand" },
];

const RESOURCES: FootLink[] = [
  { label: "GitHub", href: "https://github.com/duyet/agentstate", external: true },
  { label: "agents.md", href: "/agents.md", external: true },
  { label: "API reference", href: "/docs" },
];

function FootCol({ title, items }: { title: string; items: FootLink[] }) {
  return (
    <div>
      <MonoLabel className="mb-3 block text-[10px]">{title}</MonoLabel>
      <div className="flex flex-col gap-[9px]">
        {items.map((item) =>
          item.external ? (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="text-[13.5px] text-ink-2 transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className="text-[13.5px] text-ink-2 transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-7 px-6 py-10">
        <div className="max-w-[280px]">
          <Wordmark size={24} />
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
            One state layer for every AI agent. Built on Cloudflare D1, MIT licensed.
          </p>
        </div>
        <div className="flex flex-wrap gap-14">
          <FootCol title="Product" items={PRODUCT} />
          <FootCol title="Resources" items={RESOURCES} />
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 border-t border-line-soft px-6 py-4">
        <span className="font-mono text-[11.5px] text-faint">© 2026 AgentState</span>
        <span className="font-mono text-[11.5px] text-faint">agentstate.dev</span>
      </div>
    </footer>
  );
}
