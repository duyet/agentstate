import type { ReactNode } from "react";

export function Card({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={`rounded-xl border border-border bg-card ${className}`}>{children}</div>;
}
