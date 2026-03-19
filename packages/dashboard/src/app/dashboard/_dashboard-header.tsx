import { PlusIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
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
 *
 * @example
 * ```tsx
 * <DashboardHeader onCreateClick={handleStartCreate} />
 * ```
 */
export function DashboardHeader({ onCreateClick }: DashboardHeaderProps) {
  return (
    <PageHeader
      title="Projects"
      description="Manage your API projects and keys."
      actions={
        <Button size="sm" className="text-xs h-8" onClick={onCreateClick}>
          <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
          New Project
        </Button>
      }
    />
  );
}
