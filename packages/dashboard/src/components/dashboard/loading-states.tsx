import { TableCell, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * TableSkeleton - Animated placeholder rows for table content.
 *
 * Use during data loading to show expected layout and prevent layout shift.
 * Matches the visual structure of actual table rows with pulsing gray blocks.
 *
 * @example
 * ```tsx
 * {loading ? (
 *   <TableBody>
 *     <TableSkeleton rows={10} columns={6} />
 *   </TableBody>
 * ) : (
 *   <TableBody>
 *     {conversations.map(row => <TableRow key={row.id}>...</TableRow>)}
 *   </TableBody>
 * )}
 * ```
 */
export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map(() => (
        <TableRow key={Math.random()} className="animate-pulse">
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={Math.random()}>
              <div
                className="h-3.5 bg-muted/60 rounded"
                style={{ width: j === 0 ? "10rem" : `${(4 + j * 2).toString()}rem` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

interface CardListSkeletonProps {
  count?: number;
}

/**
 * CardListSkeleton - Animated placeholder for vertical card lists.
 *
 * Use for loading states in list views with icon, text, and action button layout.
 * Common in project lists, API key lists, and domain lists.
 *
 * @example
 * ```tsx
 * {loading ? (
 *   <CardListSkeleton count={5} />
 * ) : (
 *   <div className="space-y-3">
 *     {projects.map(project => <ProjectCard key={project.id} {...project} />)}
 *   </div>
 * )}
 * ```
 */
export function CardListSkeleton({ count = 3 }: CardListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map(() => (
        <div
          key={Math.random()}
          className="flex items-center gap-4 p-4 border border-border rounded-lg animate-pulse"
        >
          <div className="size-10 bg-muted/60 rounded shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted/60 rounded w-32" />
            <div className="h-3 bg-muted/60 rounded w-24" />
          </div>
          <div className="h-8 bg-muted/60 rounded w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}

interface StatsCardsSkeletonProps {
  count?: number;
}

/**
 * StatsCardsSkeleton - Animated placeholder for metric/stat cards grid.
 *
 * Use for loading dashboard statistics (total conversations, tokens used, etc.).
 * Displays responsive grid with label, value, and trend indicators.
 *
 * @example
 * ```tsx
 * {loading ? (
 *   <StatsCardsSkeleton count={4} />
 * ) : (
 *   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
 *     <StatCard label="Total Conversations" value="1,234" trend="+12%" />
 *     <StatCard label="Tokens Used" value="456K" trend="+5%" />
 *   </div>
 * )}
 * ```
 */
export function StatsCardsSkeleton({ count = 4 }: StatsCardsSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map(() => (
        <div
          key={Math.random()}
          className="p-6 border border-border rounded-lg bg-card animate-pulse space-y-3"
        >
          <div className="h-4 bg-muted/60 rounded w-20" />
          <div className="h-8 bg-muted/60 rounded w-24" />
          <div className="h-3 bg-muted/60 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

interface FormSkeletonProps {
  fields?: number;
}

/**
 * FormSkeleton - Animated placeholder for form inputs.
 *
 * Use during form loading or when field configuration is being fetched.
 * Shows label and input field pairs with pulsing animation.
 *
 * @example
 * ```tsx
 * {loadingSchema ? (
 *   <FormSkeleton fields={6} />
 * ) : (
 *   <form onSubmit={handleSubmit}>
 *     {fields.map(field => <FormField key={field.name} {...field} />)}
 *   </form>
 * )}
 * ```
 */
export function FormSkeleton({ fields = 4 }: FormSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map(() => (
        <div key={Math.random()} className="space-y-2 animate-pulse">
          <div className="h-4 bg-muted/60 rounded w-24" />
          <div className="h-10 bg-muted/60 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

interface PageHeaderSkeletonProps {
  hasAction?: boolean;
}

/**
 * PageHeaderSkeleton - Animated placeholder for page header.
 *
 * Use for page title and description loading state.
 * Optionally includes action button placeholder.
 *
 * @example
 * ```tsx
 * {loading ? (
 *   <PageHeaderSkeleton hasAction={true} />
 * ) : (
 *   <PageHeader
 *     title="Project Settings"
 *     description="Manage your project configuration"
 *     actions={<Button>Save Changes</Button>}
 *   />
 * )}
 * ```
 */
export function PageHeaderSkeleton({ hasAction = false }: PageHeaderSkeletonProps) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
      <div className="space-y-2">
        <div className="h-6 w-48 bg-muted/60 rounded animate-pulse" />
        <div className="h-4 w-64 bg-muted/60 rounded animate-pulse" />
      </div>
      {hasAction && <div className="h-8 w-24 bg-muted/60 rounded animate-pulse" />}
    </div>
  );
}

interface ChartCardSkeletonProps {
  height?: string;
}

/**
 * ChartCardSkeleton - Animated placeholder for chart containers.
 *
 * Use for analytics charts, graphs, and visualizations during data loading.
 * Height can be customized based on expected chart dimensions.
 *
 * @example
 * ```tsx
 * {loading ? (
 *   <ChartCardSkeleton height="h-80" />
 * ) : (
 *   <LineChart data={analyticsData} />
 * )}
 * ```
 */
export function ChartCardSkeleton({ height = "h-64" }: ChartCardSkeletonProps) {
  return <div className={`${height} bg-muted/60 rounded-lg animate-pulse`} />;
}

interface MessageListSkeletonProps {
  lines?: number;
}

/**
 * MessageListSkeleton - Animated placeholder for message/conversation content.
 *
 * Use for loading individual messages or chat responses.
 * Shows progressively wider lines to simulate natural text flow.
 *
 * @example
 * ```tsx
 * {loadingResponse ? (
 *   <MessageListSkeleton lines={4} />
 * ) : (
 *   <MessageContent text={response.text} />
 * )}
 * ```
 */
export function MessageListSkeleton({ lines = 3 }: MessageListSkeletonProps) {
  const widths = ["60%", "70%", "80%", "90%", "100%"];
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={Math.random()}
          className="h-3 bg-muted rounded animate-pulse"
          style={{ width: widths[i] ?? "60%" }}
        />
      ))}
    </div>
  );
}

interface ConversationRowSkeletonProps {
  rows?: number;
}

/**
 * ConversationRowSkeleton - Animated placeholder for conversation list items.
 *
 * Use for conversation sidebar or list views during data fetching.
 * Shows compact row layout typical of conversation previews.
 *
 * @example
 * ```tsx
 * {loading ? (
 *   <ConversationRowSkeleton rows={10} />
 * ) : (
 *   conversations.map(conv => (
 *     <ConversationRow key={conv.id} {...conv} />
 *   ))
 * )}
 * ```
 */
export function ConversationRowSkeleton({ rows = 3 }: ConversationRowSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map(() => (
        <div key={Math.random()} className="h-14 bg-muted rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
