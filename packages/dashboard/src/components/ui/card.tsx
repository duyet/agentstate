import type { ReactNode } from "react";

export function Card({ className = "", children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={`rounded-[var(--radius-lg)] border border-edge bg-panel ${className}`}>
      {children}
    </div>
  );
}
