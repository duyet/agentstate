import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className={cn("flex justify-center mt-4", className)}>
      <Button size="sm" variant="outline" onClick={onLoadMore} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Load more
      </Button>
    </div>
  );
}
