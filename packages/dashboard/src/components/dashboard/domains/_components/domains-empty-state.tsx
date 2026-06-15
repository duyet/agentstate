import { GlobeIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface DomainsEmptyStateProps {
  onAddDomain: () => void;
}

export function _DomainsEmptyState({ onAddDomain }: DomainsEmptyStateProps) {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex size-11 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-3">
          <GlobeIcon size={20} aria-hidden="true" />
        </div>
        <div className="flex max-w-xs flex-col gap-1">
          <p className="text-[13px] font-medium text-fg">No custom domains</p>
          <p className="text-[12px] leading-5 text-fg-4">
            Add a custom domain to serve your project from your own domain with SSL.
          </p>
        </div>
        <Button variant="secondary" onClick={onAddDomain} className="min-h-[36px]">
          Add your first domain
        </Button>
      </div>
    </Card>
  );
}
