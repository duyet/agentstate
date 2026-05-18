import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const skeletonItems = [1, 2, 3];

export function _MembersSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {skeletonItems.map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl p-4 ring-1 ring-foreground/10">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16 shrink-0" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
