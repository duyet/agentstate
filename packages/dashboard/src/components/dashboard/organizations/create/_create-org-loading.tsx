import { ArrowLeftIcon } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

export function CreateOrgLoading() {
  return (
    <div className="page-padding flex flex-col gap-section py-7">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius)] text-fg-4">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-tight">
          <div className="h-5 w-44 animate-pulse rounded bg-panel2" />
          <div className="h-3.5 w-60 animate-pulse rounded bg-panel2" />
        </div>
      </div>
      <Card className="card-padding flex max-w-xl flex-col gap-component">
        <div className="flex flex-col gap-tight">
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
