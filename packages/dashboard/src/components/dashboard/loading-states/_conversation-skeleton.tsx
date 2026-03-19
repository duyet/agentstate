import { Fragment } from "react";

function repeat(count: number, render: (i: number) => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render(i)}</Fragment>);
}

function repeat2(count: number, render: () => React.ReactNode) {
  // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton content, index is acceptable
  return Array.from({ length: count }, (_, i) => <Fragment key={i}>{render()}</Fragment>);
}

function SkBlock({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-muted/60 animate-pulse ${className}`} {...props} />;
}

interface MessageListSkeletonProps {
  lines?: number;
}

const MSG_WIDTHS = ["60%", "70%", "80%", "90%", "100%"] as const;

export function MessageListSkeleton({ lines = 3 }: MessageListSkeletonProps) {
  return (
    <div className="space-y-2 py-1">
      {repeat(lines, (i) => (
        <SkBlock className="h-3 rounded" style={{ width: MSG_WIDTHS[i] ?? "60%" }} />
      ))}
    </div>
  );
}

interface ConversationRowSkeletonProps {
  rows?: number;
}

export function ConversationRowSkeleton({ rows = 3 }: ConversationRowSkeletonProps) {
  return (
    <div className="space-y-2">
      {repeat2(rows, () => (
        <SkBlock className="h-14 rounded-lg" />
      ))}
    </div>
  );
}
