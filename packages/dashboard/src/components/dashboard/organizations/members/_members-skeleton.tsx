import { Card } from "@/components/ui/card";

export function _MembersSkeleton() {
  return (
    <Card className="card-padding flex flex-col gap-component">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 w-full animate-pulse rounded-[var(--radius)] bg-panel2" />
      ))}
    </Card>
  );
}
