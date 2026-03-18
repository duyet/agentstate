import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Column definition for DataTable.
 *
 * Defines how a data field should be displayed in the table.
 *
 * @template T - The type of data row
 *
 * @property key - Unique key for the column (used for React keys and data access)
 * @property label - Column header content (string or React node)
 * @property className - Optional CSS classes for the cell (responsive: `hidden md:table-cell`)
 * @property render - Optional custom renderer for cell content
 *
 * @example
 * ```ts
 * const columns: Column<User>[] = [
 *   { key: "name", label: "Name" },
 *   { key: "email", label: "Email", className: "hidden md:table-cell" },
 *   {
 *     key: "status",
 *     label: "Status",
 *     render: (row) => <Badge>{row.status}</Badge>
 *   }
 * ];
 * ```
 */
export interface Column<T> {
  key: string;
  label: React.ReactNode;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

/**
 * Props for the main DataTable component.
 *
 * @template T - The type of data row
 *
 * @property data - Array of data rows to display
 * @property columns - Column definitions
 * @property loading - Show loading skeleton (default: false)
 * @property loadingRows - Number of skeleton rows (default: 5)
 * @property empty - Empty state configuration
 * @property rowKey - Function to extract unique key for each row (default: index)
 * @property rowClassName - Optional CSS classes for rows
 * @property renderRow - Optional custom row renderer for interactive/expandable rows
 * @property className - Optional CSS classes for the table container
 */
export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  loadingRows?: number;
  empty?: {
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  rowKey?: (row: T, index: number) => string;
  rowClassName?: string | ((row: T, index: number) => string);
  renderRow?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

/**
 * DataTable - Type-safe, reusable data table component.
 *
 * Provides a consistent table pattern with built-in loading states, empty states,
 * and responsive column hiding. Fully typed with TypeScript generics.
 *
 * **Features:**
 * - Type-safe data rows with TypeScript generics
 * - Custom cell renderers for complex content
 * - Loading skeleton that matches table structure
 * - Empty state with optional action button
 * - Responsive column hiding via className
 * - Optional custom row renderer for expandable/interactive rows
 * - Full accessibility with ARIA attributes
 *
 * **When to use it:**
 * - Listing data (projects, API keys, conversations, domains, etc.)
 * - Any tabular data display
 * - Replacing duplicate table code across pages
 *
 * **When NOT to use it:**
 * - Complex interactive tables (use server components, shadcn DataTable)
 * - Very large datasets (use virtualization)
 *
 * @template T - The type of data row
 *
 * @example
 * ```tsx
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   role: "admin" | "user";
 * }
 *
 * const columns: Column<User>[] = [
 *   { key: "name", label: "Name" },
 *   { key: "email", label: "Email", className: "hidden md:table-cell" },
 *   {
 *     key: "role",
 *     label: "Role",
 *     render: (row) => <Badge variant={row.role === "admin" ? "default" : "secondary"}>
 *       {row.role}
 *     </Badge>
 *   },
 * ];
 *
 * <DataTable
 *   data={users}
 *   columns={columns}
 *   loading={isLoading}
 *   empty={{
 *     icon: <UserIcon className="h-5 w-5" />,
 *     title: "No users found",
 *     description: "Create your first user to get started",
 *     action: { label: "Add User", onClick: handleAdd }
 *   }}
 *   rowKey={(row) => row.id}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With custom row renderer for interactive rows
 * <DataTable
 *   data={projects}
 *   columns={columns}
 *   renderRow={(project) => (
 *     <TableRow
 *       className="cursor-pointer hover:bg-muted/50"
 *       onClick={() => router.push(`/projects/${project.id}`)}
 *     >
 *       <TableCell>{project.name}</TableCell>
 *       <TableCell>{project.apiKeyCount} keys</TableCell>
 *     </TableRow>
 *   )}
 * />
 * ```
 */
export function DataTable<T>({
  data,
  columns,
  loading = false,
  loadingRows = 5,
  empty,
  rowKey,
  rowClassName,
  renderRow,
  className,
}: DataTableProps<T>) {
  const defaultEmpty = {
    title: "No data",
    description: "There are no items to display",
  };

  const emptyConfig = { ...defaultEmpty, ...empty };

  // Loading state
  if (loading) {
    return (
      <div className={cn("rounded-md border", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: loadingRows }).map(() => (
              <TableRow key={Math.random()} className="animate-pulse">
                {columns.map((col, j) => (
                  <TableCell key={Math.random()} className={col.className}>
                    <div
                      className="h-3.5 bg-muted/60 rounded"
                      style={{ width: j === 0 ? "10rem" : `${(4 + j * 2).toString()}rem` }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={cn("rounded-md border", className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length}>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  {emptyConfig.icon && (
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted/60 mb-4">
                      {emptyConfig.icon}
                    </div>
                  )}
                  <p className="text-sm font-medium text-foreground mb-1">{emptyConfig.title}</p>
                  {emptyConfig.description && (
                    <p className="text-xs text-muted-foreground max-w-xs mb-4">
                      {emptyConfig.description}
                    </p>
                  )}
                  {emptyConfig.action && (
                    <Button size="sm" variant="outline" onClick={emptyConfig.action.onClick}>
                      {emptyConfig.action.label}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  // Data table
  return (
    <div className={cn("rounded-md border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {renderRow
            ? data.map((row, i) => renderRow(row, i))
            : data.map((row, i) => {
                const getKey = rowKey ? rowKey(row, i) : `${i}`;
                const getRowClassName =
                  typeof rowClassName === "function" ? rowClassName(row, i) : rowClassName;

                return (
                  <TableRow key={getKey} className={getRowClassName}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render
                          ? col.render(row, i)
                          : ((row as Record<string, unknown>)[col.key] as React.ReactNode)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Props for DataTableHeader component.
 *
 * @property title - Page or section title
 * @property description - Optional subtitle/description
 * @property actions - Optional action buttons (single button or multiple)
 */
export interface DataTableHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * DataTableHeader - Consistent header for data table pages.
 *
 * Wrapper around PageHeader for table-specific pages. Provides the same
 * consistent layout but semantically grouped for table views.
 *
 * @example
 * ```tsx
 * <DataTableHeader
 *   title="API Keys"
 *   description="Manage your project's API keys"
 *   actions={<Button onClick={handleCreate}>Create Key</Button>}
 * />
 * ```
 */
export function DataTableHeader({ title, description, actions }: DataTableHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Props for DataTablePagination component.
 *
 * @property hasPrev - Whether previous page exists
 * @property hasNext - Whether next page exists
 * @property onPrev - Callback for previous page
 * @property onNext - Callback for next page
 * @property className - Optional CSS classes
 */
export interface DataTablePaginationProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

/**
 * DataTablePagination - Previous/Next pagination controls.
 *
 * Use for offset-based pagination where you know the total page count.
 * For cursor-based pagination, use DataTableLoadMore instead.
 *
 * @example
 * ```tsx
 * <DataTablePagination
 *   hasPrev={page > 1}
 *   hasNext={data.length === pageSize}
 *   onPrev={() => setPage(page - 1)}
 *   onNext={() => setPage(page + 1)}
 * />
 * ```
 */
export function DataTablePagination({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  className,
}: DataTablePaginationProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2 mt-4", className)}>
      <Button size="sm" variant="outline" onClick={onPrev} disabled={!hasPrev}>
        Previous
      </Button>
      <Button size="sm" variant="outline" onClick={onNext} disabled={!hasNext}>
        Next
      </Button>
    </div>
  );
}

/**
 * Props for DataTableLoadMore component.
 *
 * @property hasNext - Whether more data exists
 * @property onLoadMore - Callback to load more data
 * @property loading - Show loading state
 * @property className - Optional CSS classes
 */
export interface DataTableLoadMoreProps {
  hasNext: boolean;
  onLoadMore: () => void;
  loading?: boolean;
  className?: string;
}

/**
 * DataTableLoadMore - Cursor-based "Load more" button.
 *
 * Use for cursor-based pagination (like AgentState's API) where you don't
 * know the total page count. Typically used with a `next_cursor` from the API.
 *
 * @example
 * ```tsx
 * <DataTableLoadMore
 *   hasNext={!!nextCursor}
 *   onLoadMore={handleLoadMore}
 *   loading={isLoadingMore}
 * />
 * ```
 */
export function DataTableLoadMore({
  hasNext,
  onLoadMore,
  loading = false,
  className,
}: DataTableLoadMoreProps) {
  if (!hasNext) return null;

  return (
    <div className={cn("flex justify-center mt-4", className)}>
      <Button size="sm" variant="outline" onClick={onLoadMore} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Load more
      </Button>
    </div>
  );
}
