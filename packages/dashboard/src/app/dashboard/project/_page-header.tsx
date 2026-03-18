import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

interface PageHeaderProps {
  name: string;
  slug: string;
}

export function _PageHeader({ name, slug }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="text-sm text-muted-foreground font-mono">{slug}</p>
      </div>
    </div>
  );
}
