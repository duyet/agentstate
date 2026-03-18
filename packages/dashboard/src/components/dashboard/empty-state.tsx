import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/60 mb-4">
        {icon}
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      {description && <p className="text-xs text-muted-foreground max-w-xs mb-4">{description}</p>}
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
