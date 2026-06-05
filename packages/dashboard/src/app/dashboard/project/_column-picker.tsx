import type { ColumnKey } from "./_types";

interface ColumnDefinition {
  key: ColumnKey;
  label: string;
}

interface ColumnPickerProps {
  allColumns: readonly ColumnDefinition[];
  visible: ColumnKey[];
  onChange: (columns: ColumnKey[]) => void;
}

export function ColumnPicker({ allColumns, visible, onChange }: ColumnPickerProps) {
  const toggleCol = (key: ColumnKey) =>
    onChange(visible.includes(key) ? visible.filter((c) => c !== key) : [...visible, key]);

  return (
    <fieldset className="absolute right-0 top-9 z-10 min-w-[160px] rounded-lg border border-border bg-card p-2 shadow-md">
      <legend className="sr-only">Select visible columns</legend>
      {allColumns.map((col) => (
        <label
          key={col.key}
          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted focus-within:bg-muted focus-within:ring-2 focus-within:ring-ring"
        >
          <input
            type="checkbox"
            checked={visible.includes(col.key)}
            onChange={() => toggleCol(col.key)}
            className="rounded"
          />
          <span className="flex-1">{col.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
