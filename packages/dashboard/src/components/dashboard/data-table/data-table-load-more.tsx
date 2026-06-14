"use client";

import { Button } from "@cloudflare/kumo";
import { cn } from "@/lib/utils";
import type { DataTableLoadMoreProps } from "./data-table-types";

/**
 * Cursor-based "Load more" button for infinite scroll pagination
 */
export function DataTableLoadMore({
  hasNext,
  onLoadMore,
  loading = false,
  className,
}: DataTableLoadMoreProps) {
  if (!hasNext) return null;

  return (
    <div className={cn("mt-4 flex justify-center", className)}>
      <Button size="sm" variant="outline" onClick={onLoadMore} loading={loading}>
        Load more
      </Button>
    </div>
  );
}
