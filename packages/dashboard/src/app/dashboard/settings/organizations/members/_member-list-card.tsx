import type { ReactNode } from "react";
import { type Column, DataTable } from "@/components/dashboard/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {count ?? 0} {countLabel ?? "item"}
          {(count ?? 0) !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          data={data as T[]}
          columns={columns}
          loading={isLoading}
          loadingRows={3}
          empty={empty}
          rowKey={rowKey}
        />
      </CardContent>
    </Card>
  );
}
