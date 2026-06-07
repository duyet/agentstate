import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface _PageHeaderProps {
  readonly organizationName?: string;
  readonly isLoading?: boolean;
}

export function _PageHeader({ organizationName, isLoading }: _PageHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-border pb-5">
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isLoading}
        nativeButton={false}
        render={<Link href="/dashboard/settings/organizations" />}
      >
        <ArrowLeftIcon aria-hidden="true" />
        <span className="sr-only">Back to organizations</span>
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="text-[26px] tracking-tight text-foreground">Members</h1>
        <p className="text-[14.5px] leading-6 text-muted-foreground">
          {organizationName ? `${organizationName} · ` : ""}Manage organization members
        </p>
      </div>
    </header>
  );
}
