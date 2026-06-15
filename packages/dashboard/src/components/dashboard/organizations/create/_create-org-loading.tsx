import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

export function CreateOrgLoading() {
  return (
    <div className="flex flex-col gap-6 px-4 py-7 lg:px-6">
      <div className="flex items-center gap-3 border-b border-edge-soft pb-5">
        <span className="grid size-8 place-items-center rounded-[var(--radius)] text-fg-4">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <div className="h-5 w-44 animate-pulse rounded bg-panel2" />
          <div className="h-3.5 w-60 animate-pulse rounded bg-panel2" />
        </div>
      </div>
      <Card className="flex max-w-xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-40 animate-pulse rounded bg-panel2" />
          <div className="h-3.5 w-72 animate-pulse rounded bg-panel2" />
        </div>
        <div className="h-9 w-full animate-pulse rounded-[var(--radius)] border border-edge bg-panel2" />
        <div className="flex gap-2">
          <div className="h-9 w-40 animate-pulse rounded-[var(--radius)] bg-panel2" />
          <div className="h-9 w-20 animate-pulse rounded-[var(--radius)] bg-panel2" />
        </div>
      </Card>
    </div>
  );
}
