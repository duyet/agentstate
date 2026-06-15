import { ArrowLeftIcon } from "@phosphor-icons/react";
import Link from "next/link";

export function CreateOrgHeader() {
  return (
    <header className="flex items-center gap-3 border-b border-edge-soft pb-5">
      <Link
        href="/dashboard/settings/organizations"
        aria-label="Back to organizations"
        className="grid size-8 place-items-center rounded-[var(--radius)] text-fg-3 transition-colors hover:bg-panel2 hover:text-fg"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] tracking-tight text-fg">Create Organization</h1>
        <p className="text-[14.5px] leading-6 text-fg-3">Set up a new organization for your team</p>
      </div>
    </header>
  );
}
