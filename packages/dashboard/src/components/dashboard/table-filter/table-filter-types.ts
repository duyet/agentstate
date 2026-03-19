import type { ReactNode } from "react";

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

export interface TableFilterProps {
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
  addButton?: ReactNode;

  /**
   * Whether the component is in a loading state
   */
  loading?: boolean;

  /**
   * Optional error message to display
   */
  error?: string;

  /**
   * Debounce delay in milliseconds (default: 300)
   */
  debounceMs?: number;
}
