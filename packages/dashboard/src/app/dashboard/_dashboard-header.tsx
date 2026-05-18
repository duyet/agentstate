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
        <Button size="sm" onClick={onCreateClick}>
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          New Project
        </Button>
      }
    />
  );
}
