import { FilterSelect } from "./_filter-select";
import { SearchInput } from "./_search-input";
import { useDebouncedSearch } from "./_use-debounced-search";
import type { FilterOption } from "./table-filter-types";

interface TableFilterContentProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: FilterOption[];
  searchPlaceholder?: string;
  filterLabel?: string;
  addButton?: React.ReactNode;
  loading?: boolean;
  debounceMs?: number;
}

/**
 * Search and filter controls layout for TableFilter
 * Handles search input, filter dropdown, and add button placement
 */
export function TableFilterContent({
  searchValue,
  onSearchChange,
  filterValue,
  onFilterChange,
  filterOptions,
  searchPlaceholder = "Search...",
  filterLabel,
  addButton,
  loading = false,
  debounceMs = 300,
}: TableFilterContentProps) {
  const { localValue, setLocalValue } = useDebouncedSearch({
    value: searchValue,
    onChange: onSearchChange,
    debounceMs,
  });

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <SearchInput
          value={localValue}
          onChange={setLocalValue}
          placeholder={searchPlaceholder}
          disabled={loading}
        />
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
