/**
 * Check if any filters are currently active
 * @param searchValue - Current search input value
 * @param filterValue - Current filter dropdown value
 * @returns true if search or filter is active
 */
export function hasActiveFilters(searchValue: string, filterValue?: string): boolean {
  return (
    searchValue.trim().length > 0 ||
    (filterValue !== undefined && filterValue !== "" && filterValue !== "all")
  );
}
