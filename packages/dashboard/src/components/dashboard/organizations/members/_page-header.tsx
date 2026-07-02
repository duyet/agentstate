import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";

export interface _PageHeaderProps {
  readonly organizationName?: string;
  readonly isLoading?: boolean;
}

export function _PageHeader({ organizationName, isLoading }: _PageHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <Link
        href="/dashboard/settings/organizations"
        aria-label="Back to organizations"
        aria-disabled={isLoading}
        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-fg-3 transition-colors hover:bg-panel2 hover:text-fg ${
          isLoading ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1">
        <PageHeader
          title="Members"
          description={`${organizationName ? `${organizationName} · ` : ""}Manage organization members`}
        />
      </div>
    </div>
  );
}
