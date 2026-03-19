"use client";

import { ClearButton } from "./_clear-button";
import { TableFilterContent } from "./table-filter-content";
import { hasActiveFilters } from "./table-filter-helpers";
import type { TableFilterProps } from "./table-filter-types";

// Re-exports
export type { FilterOption, TableFilterProps } from "./table-filter-types";

/**
 * TableFilter - Reusable filter/search controls for data tables.
 *
 * Common pattern used across conversations, domains, and other list views.
 * Provides debounced search input, optional filter dropdown, and clear button.
 *
 * @example
 * ```tsx
 * <TableFilter
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   onClear={() => {
 *     setSearch("");
 *     setStatusFilter("all");
 *   }}
 *   filterValue={statusFilter}
 *   onFilterChange={setStatusFilter}
 *   filterOptions={[
 *     { label: "All Statuses", value: "all" },
 *     { label: "Active", value: "active" },
 *     { label: "Inactive", value: "inactive" },
 *   ]}
 *   filterLabel="Status"
 *   searchPlaceholder="Search conversations..."
 *   addButton={<Button onClick={handleCreate}>Add New</Button>}
 *   loading={loading}
 * />
 * ```
 *
 * @example
 * Minimal version (search only)
 * ```tsx
 * <TableFilter
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   onClear={() => setSearch("")}
 *   searchPlaceholder="Search..."
 * />
 * ```
 */
export function TableFilter({
  searchValue,
  onSearchChange,
  onClear,
  filterValue,
  onFilterChange,
  filterOptions,
  searchPlaceholder,
  filterLabel,
  addButton,
  loading = false,
  error,
  debounceMs = 300,
}: TableFilterProps) {
  const showClearButton = hasActiveFilters(searchValue, filterValue);

  return (
    <section className="flex flex-col gap-3 mb-4" aria-label="Table filters">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-2">
          <TableFilterContent
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            filterValue={filterValue}
            onFilterChange={onFilterChange}
            filterOptions={filterOptions}
            searchPlaceholder={searchPlaceholder}
            filterLabel={filterLabel}
            addButton={addButton}
            loading={loading}
            debounceMs={debounceMs}
          />
          {showClearButton && <ClearButton onClear={onClear} disabled={loading} />}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </section>
  );
}
