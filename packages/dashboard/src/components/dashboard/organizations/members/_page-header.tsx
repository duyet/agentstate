import { Button } from "@cloudflare/kumo/components/button";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";

export interface _PageHeaderProps {
  readonly organizationName?: string;
  readonly isLoading?: boolean;
}

export function _PageHeader({ organizationName, isLoading }: _PageHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-border border-b pb-5">
      <Link href="/dashboard/settings/organizations">
        <Button
          variant="ghost"
          shape="square"
          size="sm"
          disabled={isLoading}
          aria-label="Back to organizations"
        >
          <ArrowLeftIcon aria-hidden="true" />
        </Button>
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="text-[26px] tracking-tight text-foreground">Members</h1>
        <p className="text-[14.5px] leading-6 text-muted-foreground">
          {organizationName ? `${organizationName} · ` : ""}Manage organization members
        </p>
      </div>
    </header>
  );
}
