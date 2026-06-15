import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared centered content container (matches the prototype `.wrap`). */
export function Wrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-6", className)}>{children}</div>;
}

/** Marketing section with consistent bottom rhythm. */
export function Section({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn("pb-20 sm:pb-22", className)}>
      <Wrap>{children}</Wrap>
    </section>
  );
}
