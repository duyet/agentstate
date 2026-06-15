import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";

export interface _PageHeaderProps {
  readonly organizationName?: string;
  readonly isLoading?: boolean;
}

export function _PageHeader({ organizationName, isLoading }: _PageHeaderProps) {
  return (
    <header className="flex items-center gap-3 border-b border-edge-soft pb-5">
      <Link
        href="/dashboard/settings/organizations"
        aria-label="Back to organizations"
        aria-disabled={isLoading}
        className={`grid size-8 place-items-center rounded-[var(--radius)] text-fg-3 transition-colors hover:bg-panel2 hover:text-fg ${
          isLoading ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="text-[26px] tracking-tight text-fg">Members</h1>
        <p className="text-[14.5px] leading-6 text-fg-3">
          {organizationName ? `${organizationName} · ` : ""}Manage organization members
        </p>
      </div>
    </header>
  );
}
