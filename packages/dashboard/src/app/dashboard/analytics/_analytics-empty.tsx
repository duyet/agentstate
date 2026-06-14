"use client";

import { Button, LayerCard, Text } from "@cloudflare/kumo";
import { ChartLineIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

export function AnalyticsEmpty() {
  const router = useRouter();

  return (
    <LayerCard className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted/60">
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
