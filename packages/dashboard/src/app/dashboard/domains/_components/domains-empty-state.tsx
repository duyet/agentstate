"use client";

import { GlobeIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";

export interface DomainsEmptyStateProps {
  onAddDomain: () => void;
}

export function _DomainsEmptyState({ onAddDomain }: DomainsEmptyStateProps) {
  return (
    <Card className="p-12 border-dashed">
      <EmptyState
        icon={<GlobeIcon className="h-8 w-8 text-muted-foreground" />}
        title="No custom domains"
        description="Add a custom domain to serve your project from your own domain with SSL."
        action={{ label: "Add your first domain", onClick: onAddDomain }}
      />
    </Card>
  );
}
