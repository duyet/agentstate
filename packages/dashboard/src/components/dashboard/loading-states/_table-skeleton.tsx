import { Fragment } from "react";

function repeat(count: number, render: (i: number) => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render(i)}</Fragment>);
}

function repeat2(count: number, render: () => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render()}</Fragment>);
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <>
      {repeat2(rows, () => (
        <tr>
          {repeat(columns, (j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
            <td key={j} className="p-2">
              <div
                className="h-3.5 animate-pulse rounded bg-muted"
                style={{ width: j === 0 ? "10rem" : `${4 + j * 2}rem` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
