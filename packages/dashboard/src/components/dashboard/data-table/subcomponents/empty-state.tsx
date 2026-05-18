import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
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
      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
      aria-live="polite"
    >
      {icon && (
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-xl",
            error ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex max-w-xs flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick}>
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
