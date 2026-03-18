"use client";

import { ClearButton } from "./_clear-button";
import { FilterSelect } from "./_filter-select";
import { SearchInput } from "./_search-input";
import { useDebouncedSearch } from "./_use-debounced-search";

/**
 * Option for filter dropdown
 */
export interface FilterOption {
  /**
   * Display label
   */
  label: string;

  /**
   * Value to pass to onFilterChange
   */
  value: string;
}

interface TableFilterProps {
  /**
   * Current search input value
   */
  searchValue: string;

  /**
   * Callback when search value changes (debounced)
   */
  onSearchChange: (value: string) => void;

  /**
   * Callback when clear button is clicked (resets both search and filter)
   */
  onClear: () => void;

  /**
   * Current filter value
   */
  filterValue?: string;

  /**
   * Callback when filter value changes
   */
  onFilterChange?: (value: string) => void;

  /**
   * Options for filter dropdown
   */
  filterOptions?: FilterOption[];

  /**
   * Optional placeholder for search input
   */
  searchPlaceholder?: string;

  /**
   * Optional label for filter dropdown (e.g., "Status")
   */
  filterLabel?: string;

  /**
   * Optional "Add" button to display on the right side
   */
  addButton?: React.ReactNode;

  /**
   * Whether the component is in a loading state
   */
  loading?: boolean;

  /**
   * Debounce delay in milliseconds (default: 300)
   */
  debounceMs?: number;
}

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
  searchPlaceholder = "Search...",
  filterLabel,
  addButton,
  loading = false,
  debounceMs = 300,
}: TableFilterProps) {
  const { localValue, setLocalValue } = useDebouncedSearch({
    value: searchValue,
    onChange: onSearchChange,
    debounceMs,
  });

  const hasActiveFilters =
    searchValue.trim().length > 0 ||
    (filterValue !== undefined && filterValue !== "" && filterValue !== "all");

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="flex-1 flex gap-2">
        <SearchInput
          value={localValue}
          onChange={setLocalValue}
          placeholder={searchPlaceholder}
          disabled={loading}
        />

        {hasActiveFilters && <ClearButton onClear={onClear} disabled={loading} />}
      </div>

      <div className="flex items-center gap-2">
        {filterOptions && onFilterChange && (
          <FilterSelect
            value={filterValue}
            onChange={onFilterChange}
            options={filterOptions}
            label={filterLabel}
            disabled={loading}
          />
        )}

        {addButton}
      </div>
    </div>
  );
}
