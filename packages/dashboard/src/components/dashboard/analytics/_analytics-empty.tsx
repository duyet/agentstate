import { ChartLineIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AnalyticsEmpty() {
  const router = useRouter();

  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-edge bg-panel2">
        <ChartLineIcon className="size-5 text-fg-3" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-[15px] font-medium text-fg">No projects yet</h3>
        <p className="text-[13px] text-fg-3">
          Create a project to start tracking conversations, messages, and token usage.
        </p>
      </div>
      <Button variant="primary" onClick={() => router.push("/dashboard")}>
        Create your first project
      </Button>
    </Card>
  );
}
