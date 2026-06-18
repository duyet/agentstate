"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] font-medium transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base";

const variants: Record<Variant, string> = {
  primary: "bg-fg text-[var(--color-base)] hover:opacity-90",
  secondary: "border border-edge text-fg hover:bg-panel2",
  ghost: "text-fg-3 hover:text-fg hover:bg-panel2",
  danger: "border border-neg/40 bg-neg/10 text-neg hover:bg-neg/20",
};

const sizes: Record<Size, string> = {
  sm: "min-h-[32px] px-3 py-1.5 text-[12px] gap-1",
  md: "min-h-[40px] px-4 py-2.5 text-[13px]",
  lg: "min-h-[48px] px-6 py-3 text-[14px] gap-2",
  icon: "size-9 px-0",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-spin size-4"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      {children}
    </button>
  );
}
