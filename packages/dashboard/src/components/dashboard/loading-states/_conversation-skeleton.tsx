import { Fragment } from "react";

function repeat(count: number, render: (i: number) => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render(i)}</Fragment>);
}

function repeat2(count: number, render: () => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render()}</Fragment>);
}

interface MessageListSkeletonProps {
  lines?: number;
}

const MSG_WIDTHS = ["60%", "70%", "80%", "90%", "100%"] as const;

export function MessageListSkeleton({ lines = 3 }: MessageListSkeletonProps) {
  return (
    <div className="flex flex-col gap-2 py-1">
      {repeat(lines, (i) => (
        <div className="h-3 animate-pulse rounded bg-muted" style={{ width: MSG_WIDTHS[i] ?? "60%" }} />
      ))}
    </div>
  );
}

interface ConversationRowSkeletonProps {
  rows?: number;
}

export function ConversationRowSkeleton({ rows = 3 }: ConversationRowSkeletonProps) {
  return (
    <div className="flex flex-col gap-2">
      {repeat2(rows, () => (
        <div className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
