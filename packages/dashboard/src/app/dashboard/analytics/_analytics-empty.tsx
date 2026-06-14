"use client";

import { BarChart3Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AnalyticsEmpty() {
  const router = useRouter();

  return (
    <Card className="p-12 flex flex-col items-center justify-center text-center border-dashed">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/60 mb-4">
        <BarChart3Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">No projects yet</p>
      <p className="text-xs text-muted-foreground max-w-xs mb-4">
        Create a project to start tracking conversations, messages, and token usage.
      </p>
      <Button size="sm" variant="outline" onClick={() => router.push("/dashboard")}>
        Create your first project
      </Button>
    </Card>
  );
}
