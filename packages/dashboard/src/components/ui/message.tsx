"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Message — row wrapper for a single chat message. Handles start/end
 * alignment and optional header/footer slots (role label, meta line) around
 * the message content (typically a Bubble or full-width Markdown block).
 */
export function Message({
  align,
  header,
  footer,
  className,
  children,
}: {
  align: "start" | "end";
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col", align === "end" ? "items-end" : "items-start", className)}>
      {header}
      {children}
      {footer}
    </div>
  );
}

/**
 * Bubble — surface for a single message's content. `variant="default"` is a
 * filled muted surface (user messages); `variant="outline"` is a bordered
 * transparent surface. `align` controls which corner gets the small radius,
 * matching the chat-bubble "tail" convention (end: bottom-right, start:
 * bottom-left).
 */
export function Bubble({
  variant = "default",
  align,
  className,
  children,
}: {
  variant?: "default" | "outline";
  align: "start" | "end";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "max-w-[85%] px-4 py-2.5",
        align === "end" ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm",
        variant === "outline" ? "border border-border bg-transparent" : "bg-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}
