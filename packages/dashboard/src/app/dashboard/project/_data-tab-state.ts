import { useState } from "react";
import type { ColumnKey } from "./_components";

const DEFAULT_COLUMNS: ColumnKey[] = ["title", "message_count", "token_count", "total_cost", "updated_at"];

export function _useDataTabState() {
  const [visibleCols, setVisibleCols] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [showColPicker, setShowColPicker] = useState(false);

  return {
    visibleCols,
    showColPicker,
    setVisibleCols,
    setShowColPicker,
    toggleColPicker: () => setShowColPicker((prev) => !prev),
  };
}
