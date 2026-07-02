import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <Card className="card-padding flex flex-col gap-component">
      <div className="flex flex-col gap-tight">
        <h2 className="text-[16px] font-semibold text-fg">{title}</h2>
        <p className="as-mono-sm text-fg-3">
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
        <div className="flex flex-col items-center gap-tight py-10 text-center">
          <span className="grid size-9 place-items-center rounded-[var(--radius)] border border-edge bg-panel2 text-fg-4">
            {empty.icon}
          </span>
          <p className="text-[13.5px] font-medium text-fg-2">{empty.title}</p>
          {empty.description && <p className="text-[12.5px] text-fg-3">{empty.description}</p>}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((c) => (
                  <TableCell key={c.key}>{c.render(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
