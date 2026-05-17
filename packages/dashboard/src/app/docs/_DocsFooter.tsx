import { ArrowRightIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DocsFooter() {
  return (
    <Card>
      <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <FileTextIcon className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
          <div className="grid gap-1">
            <p className="text-sm font-medium">Machine-readable integration guide</p>
            <p className="text-sm text-muted-foreground">
              Give agents a compact, plain-text reference for runtime integration.
            </p>
          </div>
        </div>
        <Button
          nativeButton={false}
          // biome-ignore lint/a11y/useAnchorContent: Base UI injects the Button children into this render anchor.
          render={<a href="/agents.md" />}
          size="sm"
          variant="outline"
        >
          agents.md
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </CardContent>
    </Card>
  );
}
