export type ColumnKey =
  | "title"
  | "external_id"
  | "message_count"
  | "token_count"
  | "metadata"
  | "created_at"
  | "updated_at";

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
    <div
      role="menu"
      aria-label="Select visible columns"
      className="absolute right-0 top-9 z-10 border border-border rounded-lg bg-card p-2 shadow-lg min-w-[160px]"
    >
      {allColumns.map((col) => (
        <label
          key={col.key}
          className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded"
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
    </div>
  );
}
