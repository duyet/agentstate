import * as React from "react"

import { cn } from "@/lib/utils"

function MessageGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-group"
      className={cn("flex min-w-0 flex-col gap-2", className)}
      {...props}
    />
  )
}

function Message({
  className,
  align = "start",
  header,
  footer,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  align?: "start" | "end"
  header?: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(
        "group/message relative flex w-full min-w-0 flex-col gap-1 text-sm",
        align === "end" ? "items-end" : "items-start",
        className
      )}
      {...props}
    >
      {header}
      {children}
      {footer}
    </div>
  )
}

function Bubble({
  variant = "default",
  align,
  className,
  children,
}: {
  variant?: "default" | "outline"
  align: "start" | "end"
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-slot="message-bubble"
      className={cn(
        "max-w-[85%] px-4 py-2.5",
        align === "end" ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm",
        variant === "outline" ? "border border-border bg-transparent" : "bg-muted",
        className
      )}
    >
      {children}
    </div>
  )
}

function MessageAvatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-avatar"
      className={cn(
        "flex w-fit min-w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted group-has-data-[slot=message-footer]/message:-translate-y-8",
        className
      )}
      {...props}
    />
  )
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex w-full min-w-0 flex-col gap-2.5 wrap-break-word group-data-[align=end]/message:*:data-slot:self-end",
        className
      )}
      {...props}
    />
  )
}

function MessageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-header"
      className={cn(
        "flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0",
        className
      )}
      {...props}
    />
  )
}

function MessageFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-footer"
      className={cn(
        "flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0 group-data-[align=end]/message:justify-end",
        className
      )}
      {...props}
    />
  )
}

export {
  MessageGroup,
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
  Bubble,
}
