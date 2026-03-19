import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import type { Column } from "../data-table-types";

interface EmptyConfig {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

interface EmptyStateContentProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  error?: boolean;
}

export function EmptyStateContent({
  icon,
  title,
  description,
  action,
  error,
}: EmptyStateContentProps) {
  return (
    <output
      className="flex flex-col items-center justify-center py-16 text-center"
      aria-live="polite"
    >
      {icon && (
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-full mb-4 ${error ? "bg-destructive/10" : "bg-muted/60"}`}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      {description && <p className="text-xs text-muted-foreground max-w-xs mb-4">{description}</p>}
      {action && (
        <Button size="sm" variant="outline" className="h-8" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </output>
  );
}

interface ErrorEmptyRowProps<T> {
  columns: Column<T>[];
  config: EmptyConfig;
  error?: boolean;
}

/** Single row for error or empty state */
export function ErrorEmptyRow<T>({ columns, config, error }: ErrorEmptyRowProps<T>) {
  return (
    <TableRow>
      <TableCell colSpan={columns.length}>
        <EmptyStateContent
          icon={config.icon}
          title={config.title}
          description={config.description}
          action={config.action}
          error={error}
        />
      </TableCell>
    </TableRow>
  );
}

export type { EmptyConfig };
