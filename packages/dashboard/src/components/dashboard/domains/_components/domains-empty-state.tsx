import { GlobeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface DomainsEmptyStateProps {
  onAddDomain: () => void;
}

export function _DomainsEmptyState({ onAddDomain }: DomainsEmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-element py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] border border-edge bg-panel2 text-fg-3">
        <GlobeIcon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex max-w-xs flex-col gap-1">
        <p className="text-[14px] font-medium text-fg">No custom domains</p>
        <p className="text-[12.5px] leading-5 text-fg-3">
          Add a custom domain to serve your project from your own domain with SSL.
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onAddDomain}>
        Add your first domain
      </Button>
    </Card>
  );
}
