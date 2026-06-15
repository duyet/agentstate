import { Card } from "@/components/ui/card";

export function _MembersSkeleton() {
  return (
    <Card className="flex flex-col gap-4 p-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 w-full animate-pulse rounded-[var(--radius)] bg-panel2" />
      ))}
    </Card>
  );
}
