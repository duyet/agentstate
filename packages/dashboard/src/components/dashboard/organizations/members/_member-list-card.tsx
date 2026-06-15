import { Surface } from "@cloudflare/kumo/components/surface";
import { Text } from "@cloudflare/kumo/components/text";
import type { ReactNode } from "react";
import { type Column, DataTable } from "@/components/dashboard/data-table";

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
    <Surface className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <Text variant="heading3" as="h2">
          {title}
        </Text>
        <Text variant="secondary" as="p">
          {count ?? 0} {countLabel ?? "item"}
          {(count ?? 0) !== 1 ? "s" : ""}
        </Text>
      </div>
      <DataTable
        data={data as T[]}
        columns={columns}
        loading={isLoading}
        loadingRows={3}
        empty={empty}
        rowKey={rowKey}
      />
    </Surface>
  );
}
