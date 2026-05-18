import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  name: string;
  slug: string;
}

export function _PageHeader({ name, slug }: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-center gap-3 border-b border-border/70 pb-5">
      <Button
        variant="ghost"
        size="icon-sm"
        nativeButton={false}
        render={<Link href="/dashboard" />}
      >
        <ArrowLeftIcon aria-hidden="true" />
        <span className="sr-only">Back to projects</span>
      </Button>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="truncate font-mono text-sm text-muted-foreground">{slug}</p>
      </div>
    </header>
  );
}
