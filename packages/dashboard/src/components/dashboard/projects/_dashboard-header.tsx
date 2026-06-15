import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  onCreateClick: () => void;
}

/**
 * DashboardHeader - Page header for the projects dashboard.
 *
 * Features:
 * - Title and description
 * - "New Project" action button
 */
export function DashboardHeader({ onCreateClick }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="text-[24px] font-semibold tracking-tight text-fg">Projects</h1>
        <p className="text-[13.5px] leading-6 text-fg-3">Manage your API projects and keys.</p>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <Button variant="primary" onClick={onCreateClick} className="min-h-[36px] py-2">
          <Plus size={15} aria-hidden="true" />
          New Project
        </Button>
      </div>
    </header>
  );
}
