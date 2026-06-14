import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DataTablePaginationProps } from "./data-table-types";

/**
 * Previous/Next pagination controls for offset-based pagination
 */
export function DataTablePagination({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  className,
}: DataTablePaginationProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2 mt-4", className)}>
      <Button size="sm" variant="outline" onClick={onPrev} disabled={!hasPrev}>
        Previous
      </Button>
      <Button size="sm" variant="outline" onClick={onNext} disabled={!hasNext}>
        Next
      </Button>
    </div>
  );
}
