/**
 * DataTable Component Examples
 *
 * This module provides comprehensive examples demonstrating DataTable component usage patterns.
 * Each example is self-contained and ready to adapt for your use case.
 *
 * ## Examples Index
 *
 * 1. **BasicTableExample** - Simple table with header and actions
 * 2. **CustomCellRendererExample** - Custom cell rendering with badges and conditional logic
 * 3. **LoadingStateExample** - Skeleton loading state
 * 4. **EmptyStateExample** - Empty state with call-to-action
 * 5. **CustomRowRendererExample** - Interactive rows with click handlers
 * 6. **PaginationExample** - Offset-based pagination
 * 7. **LoadMoreExample** - Cursor-based "load more" pagination
 *
 * ## Quick Start
 *
 * ```tsx
 * import { BasicTableExample } from '@/components/dashboard/data-table.examples';
 *
 * // Use directly or copy/adapt the pattern
 * <BasicTableExample />
 * ```
 */

// Re-export all examples
export { BasicTableExample } from "./data-table/data-table.examples.basic";
export { CustomCellRendererExample } from "./data-table/data-table.examples.custom";
// Re-export types for external use
export type { ApiKey, Project } from "./data-table/data-table.examples.mock";
export {
  LoadMoreExample,
  PaginationExample,
} from "./data-table/data-table.examples.pagination";
export { CustomRowRendererExample } from "./data-table/data-table.examples.row";
export {
  EmptyStateExample,
  LoadingStateExample,
} from "./data-table/data-table.examples.states";
