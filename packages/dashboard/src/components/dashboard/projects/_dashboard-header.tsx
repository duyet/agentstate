import { Button } from "@cloudflare/kumo/components/button";
import { Plus } from "@phosphor-icons/react";
import { PageHeader } from "@/components/dashboard/page-header";

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
        <Button size="sm" variant="primary" icon={<Plus aria-hidden />} onClick={onCreateClick}>
          New Project
        </Button>
      }
    />
  );
}
