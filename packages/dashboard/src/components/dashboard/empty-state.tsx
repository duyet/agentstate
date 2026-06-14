"use client";

import { Button } from "@cloudflare/kumo/components/button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: React.ReactNode;
    onClick: () => void;
  };
}

/**
 * EmptyState - A centered empty state component with optional action.
 *
 * Used when a list, table, or section has no items to display. Provides a consistent
 * visual pattern with an icon, title, description, and optional call-to-action button.
 *
 * **When to use it:**
 * - Empty lists (no projects, no API keys, no conversations)
 * - Empty search results
 * - Empty states after filtering
 * - Onboarding screens prompting first action
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<PlusIcon className="h-5 w-5" />}
 *   title="No projects yet"
 *   description="Create your first project to start tracking conversations"
 *   action={{ label: "Create Project", onClick: handleCreate }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<SearchIcon className="h-5 w-5" />}
 *   title="No results found"
 *   description="Try adjusting your search terms or filters"
 * />
 * ```
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex max-w-xs flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
