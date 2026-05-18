"use client";

import { CardListSkeleton, PageHeaderSkeleton } from "@/components/dashboard/loading-states";

export function _DomainsLoadingSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton hasAction />
      <CardListSkeleton count={3} />
    </div>
  );
}
