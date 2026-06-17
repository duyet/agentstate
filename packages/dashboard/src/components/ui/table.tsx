"use client";

import type { HTMLAttributes, ReactNode } from "react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  responsive?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ children, responsive = true, className = "", ...rest }, ref) => (
    <div className={cn(responsive && "overflow-x-auto", className)}>
      <table ref={ref} className="w-full border-collapse text-left" {...rest}>
        {children}
      </table>
    </div>
  ),
);

Table.displayName = "Table";

interface TableHeaderProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ children, className = "", ...rest }, ref) => (
    <thead ref={ref} className={cn("border-b border-edge bg-panel", className)} {...rest}>
      {children}
    </thead>
  ),
);

TableHeader.displayName = "TableHeader";

interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
  children: ReactNode;
}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ children, className = "", ...rest }, ref) => (
    <tbody ref={ref} className={cn("divide-y divide-edge-soft", className)} {...rest}>
      {children}
    </tbody>
  ),
);

TableBody.displayName = "TableBody";

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  clickable?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ children, clickable = false, className = "", ...rest }, ref) => (
    <tr
      ref={ref}
      className={cn("transition-colors", clickable && "cursor-pointer hover:bg-panel2", className)}
      {...rest}
    >
      {children}
    </tr>
  ),
);

TableRow.displayName = "TableRow";

interface TableHeadProps extends HTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  align?: "left" | "center" | "right";
}

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ children, align = "left", className = "", ...rest }, ref) => (
    <th
      ref={ref}
      className={cn(
        "px-4 py-2.5 font-mono text-[10.5px] font-normal uppercase tracking-[0.12em] text-fg-4",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  ),
);

TableHead.displayName = "TableHead";

interface TableCellProps extends HTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  align?: "left" | "center" | "right";
  mono?: boolean;
  colSpan?: number;
}

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ children, align = "left", mono = false, className = "", colSpan, ...rest }, ref) => (
    <td
      ref={ref}
      colSpan={colSpan}
      className={cn(
        "px-4 py-3.5 text-[13px] text-fg-2",
        align === "center" && "text-center",
        align === "right" && "text-right",
        mono && "font-mono num",
        className,
      )}
      {...rest}
    >
      {children}
    </td>
  ),
);

TableCell.displayName = "TableCell";

interface TableCaptionProps extends HTMLAttributes<HTMLTableCaptionElement> {
  children: ReactNode;
}

export const TableCaption = React.forwardRef<HTMLTableCaptionElement, TableCaptionProps>(
  ({ children, className = "", ...rest }, ref) => (
    <caption ref={ref} className={cn("px-4 py-3 text-[13px] text-fg-3", className)} {...rest}>
      {children}
    </caption>
  ),
);

TableCaption.displayName = "TableCaption";

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton, index is stable
            <TableHead key={i}>
              <div className="h-3.5 w-40 animate-pulse rounded bg-edge" />
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
                <div className="h-3.5 w-32 animate-pulse rounded bg-edge" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </>
  );
}
