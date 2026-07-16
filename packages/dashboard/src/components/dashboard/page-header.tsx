interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * PageHeader - Consistent page title layout with optional description and actions.
 *
 * Standard header component for all pages in the dashboard. Ensures consistent
 * spacing, typography, and action button placement across the application.
 *
 * **When to use it:**
 * - All page-level headers (projects, settings, analytics, etc.)
 * - Section headers with actions
 * - Anywhere you need consistent title + actions layout
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Projects"
 *   description="Manage your AgentState projects and API keys"
 *   actions={<Button onClick={handleCreate}>New Project</Button>}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Analytics"
 *   description="Track your usage and performance metrics"
 *   actions={
 *     <>
 *       <DatePicker />
 *       <Button>Export</Button>
 *     </>
 *   }
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Simple header without actions
 * <PageHeader
 *   title="Settings"
 *   description="Configure your account preferences"
 * />
 * ```
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-[22px] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </header>
  );
}
