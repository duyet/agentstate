import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";

export function CreateOrgHeader() {
  return (
    <div className="flex items-start gap-3">
      <Link
        href="/dashboard/settings/organizations"
        aria-label="Back to organizations"
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-fg-3 transition-colors hover:bg-panel2 hover:text-fg"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1">
        <PageHeader
          title="Create Organization"
          description="Set up a new organization for your team"
        />
      </div>
    </div>
  );
}
