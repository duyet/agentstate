import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Section block with a display-font heading and a hairline bottom border. */
export function BrandRow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-[38px]">
      <h2 className="mb-4 border-b border-border pb-2.5 text-[18px]">{title}</h2>
      {children}
    </section>
  );
}

/** A brand specimen card: content area + a mono caption footer bar. */
export function BrandCard({
  label,
  children,
  dark = false,
}: {
  label: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[9px] border border-border bg-card">
      {children}
      <div
        className={cn(
          "border-t px-3 py-2.5",
          dark ? "border-zinc-800 bg-zinc-900" : "border-line-soft bg-bg-deep",
        )}
      >
        <span
          className={cn(
            "font-mono text-[10.5px] uppercase",
            dark ? "text-zinc-400" : "text-faint",
          )}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
