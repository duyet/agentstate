import { Surface } from "@cloudflare/kumo/components/surface";
import { FormSkeleton } from "@/components/dashboard/loading-states";

export function _MembersSkeleton() {
  return (
    <Surface className="flex flex-col gap-4 p-6">
      <FormSkeleton fields={3} />
    </Surface>
  );
}
