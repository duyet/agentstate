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
    <fieldset className="relative z-10 min-w-[180px] rounded-[var(--radius-lg)] border border-edge bg-panel p-1.5 shadow-md">
      <legend className="sr-only">Select visible columns</legend>
      {allColumns.map((col) => (
        <label
          key={col.key}
          className="flex cursor-pointer items-center gap-2 rounded-[var(--radius)] px-2 py-1.5 text-[13px] text-fg-2 transition-[background-color] hover:bg-panel2 focus-within:bg-panel2 focus-within:ring-2 focus-within:ring-accent"
        >
          <input
            type="checkbox"
            checked={visible.includes(col.key)}
            onChange={() => toggleCol(col.key)}
            className="size-3.5 rounded border-edge accent-accent"
          />
          <span className="flex-1">{col.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
