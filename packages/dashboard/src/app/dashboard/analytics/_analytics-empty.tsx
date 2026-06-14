"use client";

import { ChartLineIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Button, LayerCard, Text } from "@cloudflare/kumo";

export function AnalyticsEmpty() {
  const router = useRouter();

  return (
    <LayerCard className="p-12 flex flex-col items-center justify-center text-center border-dashed">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/60 mb-4">
        <ChartLineIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <Text variant="heading3" as="h3">
        No projects yet
      </Text>
      <Text variant="secondary" as="p" size="sm">
        Create a project to start tracking conversations, messages, and token usage.
      </Text>
      <Button size="sm" variant="outline" onClick={() => router.push("/dashboard")}>
        Create your first project
      </Button>
    </LayerCard>
  );
}
