"use client";

import { GlobeIcon } from "@phosphor-icons/react";
import { Surface } from "@cloudflare/kumo/components/surface";
import { EmptyState } from "@/components/dashboard/empty-state";

export interface DomainsEmptyStateProps {
  onAddDomain: () => void;
}

export function _DomainsEmptyState({ onAddDomain }: DomainsEmptyStateProps) {
  return (
    <Surface className="border-border border border-dashed">
      <EmptyState
        icon={<GlobeIcon aria-hidden="true" />}
        title="No custom domains"
        description="Add a custom domain to serve your project from your own domain with SSL."
        action={{ label: "Add your first domain", onClick: onAddDomain }}
      />
    </Surface>
  );
}
