import * as React from "react"

import { cn } from "@/lib/utils"

function Table({
  className,
  responsive = true,
  ...props
}: React.ComponentProps<"table"> & { responsive?: boolean }) {
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full", responsive && "overflow-x-auto")}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({
  className,
  clickable = false,
  ...props
}: React.ComponentProps<"tr"> & { clickable?: boolean }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        clickable && "cursor-pointer",
        className
      )}
      {...props}
    />
  )
}

function TableHead({
  className,
  align = "left",
  ...props
}: React.ComponentProps<"th"> & { align?: "left" | "center" | "right" }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  align = "left",
  mono = false,
  ...props
}: React.ComponentProps<"td"> & {
  align?: "left" | "center" | "right"
  mono?: boolean
}) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",
        mono && "font-mono num",
        className
      )}
      {...props}
    />
  )
}

function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton, index is stable
            <TableHead key={i}>
              <div className="h-3.5 w-40 animate-pulse rounded bg-border" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton, index is stable
          <TableRow key={`skeleton-${i}`}>
            {Array.from({ length: columns }).map((_, c) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton, index is stable
              <TableCell key={c}>
                <div className="h-3.5 w-32 animate-pulse rounded bg-border" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableSkeleton,
}
