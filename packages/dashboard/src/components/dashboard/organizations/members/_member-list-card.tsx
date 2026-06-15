import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
}

export interface MemberListCardProps<T> {
  readonly title: string;
  readonly count?: number;
  readonly countLabel?: string;
  readonly data: readonly T[];
  readonly columns: Column<T>[];
  readonly isLoading: boolean;
  readonly empty: {
    readonly icon: ReactNode;
    readonly title: string;
    readonly description?: string;
  };
  readonly rowKey: (row: T) => string;
}

export function MemberListCard<T>({
  title,
  count,
  countLabel,
  data,
  columns,
  isLoading,
  empty,
  rowKey,
}: MemberListCardProps<T>) {
  const total = count ?? data.length;

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[16px] font-semibold text-fg">{title}</h2>
        <p className="num font-mono text-[12.5px] text-fg-3">
          {total} {countLabel ?? "item"}
          {total !== 1 ? "s" : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-12 w-full animate-pulse border-b border-edge-soft bg-panel2/40"
            />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="grid size-9 place-items-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
            {empty.icon}
          </span>
          <p className="text-[13.5px] font-medium text-fg-2">{empty.title}</p>
          {empty.description && <p className="text-[12.5px] text-fg-3">{empty.description}</p>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-edge">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="px-3 py-2 text-left font-mono text-[10.5px] uppercase tracking-[0.1em] text-fg-4 first:pl-0 last:pr-0"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={rowKey(row)}
                  className="border-b border-edge-soft transition-colors last:border-0 hover:bg-panel2/50"
                >
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-3 first:pl-0 last:pr-0">
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
