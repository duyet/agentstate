"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [localSearchValue, setLocalSearchValue] = useState(searchValue);

  // Sync external search value to local state
  useEffect(() => {
    setLocalSearchValue(searchValue);
  }, [searchValue]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchValue !== searchValue) {
        onSearchChange(localSearchValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localSearchValue, searchValue, onSearchChange, debounceMs]);

  const hasActiveFilters =
    searchValue.trim().length > 0 ||
    (filterValue !== undefined && filterValue !== "" && filterValue !== "all");

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      {/* Search input */}
      <div className="flex-1 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={searchPlaceholder}
            value={localSearchValue}
            onChange={(e) => setLocalSearchValue(e.target.value)}
            className="pl-8"
            disabled={loading}
            aria-label="Search"
          />
        </div>

        {/* Clear button (only show when filters are active) */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="default"
            onClick={onClear}
            disabled={loading}
            aria-label="Clear filters"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2">
        {/* Filter dropdown */}
        {filterOptions && onFilterChange && (
          <div className="flex items-center gap-2">
            {filterLabel && <span className="text-sm text-muted-foreground">{filterLabel}</span>}
            <select
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              disabled={loading}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              aria-label={filterLabel || "Filter"}
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Add button */}
        {addButton}
      </div>
    </div>
  );
}
