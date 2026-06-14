"use client";

import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { GlobeIcon } from "@phosphor-icons/react";
import { EmptyState } from "@/components/dashboard/empty-state";

export interface DomainsEmptyStateProps {
  onAddDomain: () => void;
}

export function _DomainsEmptyState({ onAddDomain }: DomainsEmptyStateProps) {
  return (
    <LayerCard className="border border-border">
      <EmptyState
        icon={<GlobeIcon aria-hidden="true" />}
        title="No custom domains"
        description="Add a custom domain to serve your project from your own domain with SSL."
        action={{ label: "Add your first domain", onClick: onAddDomain }}
      />
    </LayerCard>
  );
}
