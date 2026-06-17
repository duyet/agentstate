"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import * as React from "react";
import { cn } from "@/lib/utils";

type ToggleVariant = "default" | "outline" | "ghost";
type ToggleSize = "sm" | "md" | "lg";

interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ToggleVariant;
  size?: ToggleSize;
  pressed?: boolean;
  children?: ReactNode;
  ariaLabel?: string;
  ariaPressed?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base";

const variants: Record<ToggleVariant, string> = {
  default:
    "bg-panel border border-edge text-fg hover:bg-panel2 hover:border-fg/50 data-[pressed=true]:bg-accent data-[pressed=true]:text-accent-fg data-[pressed=true]:border-accent",
  outline:
    "border-2 border-edge text-fg hover:bg-panel2 hover:border-fg/50 data-[pressed=true]:border-accent data-[pressed=true]:bg-accent/10 data-[pressed=true]:text-accent",
  ghost:
    "text-fg-3 hover:text-fg hover:bg-panel2 data-[pressed=true]:text-accent data-[pressed=true]:bg-accent/10",
};

const sizes: Record<ToggleSize, string> = {
  sm: "h-8 px-2.5 text-[12px]",
  md: "h-9 px-3 text-[13px]",
  lg: "h-10 px-4 text-[14px]",
};

export const Toggle = function Toggle({
  variant = "default",
  size = "md",
  pressed = false,
  className = "",
  children,
  ariaLabel,
  ariaPressed,
  ...rest
}: ToggleProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      aria-pressed={ariaPressed ?? pressed}
      aria-label={ariaLabel}
      data-pressed={pressed}
      {...rest}
    >
      {children}
    </button>
  );
};

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const switchBase = "inline-flex items-center gap-3 cursor-pointer select-none";

const switchTrackBase =
  "relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-200";
const switchTrackSizes = {
  sm: "size-5",
  md: "size-6",
  lg: "size-7",
};
const switchTrackVariants = {
  default: "bg-edge border-edge data-[checked=true]:bg-accent data-[checked=true]:border-accent",
  outline:
    "bg-transparent border-2 border-edge data-[checked=true]:border-accent data-[checked=true]:bg-accent/10",
};

const switchThumbBase =
  "pointer-events-none inline-block rounded-full bg-fg shadow-sm transition-transform duration-200";
const switchThumbSizes = {
  sm: "size-3 translate-x-0 data-[checked=true]:translate-x-full",
  md: "size-4 translate-x-0 data-[checked=true]:translate-x-5",
  lg: "size-5 translate-x-0 data-[checked=true]:translate-x-6",
};

const switchLabel = "text-[13px] text-fg-2";
const switchDescription = "text-[11.5px] text-fg-4";

export function Switch({
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  variant = "default",
  size = "md",
  disabled = false,
  className = "",
  id,
  ...rest
}: SwitchProps) {
  const isControlled = controlledChecked !== undefined;
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
  const checked = isControlled ? controlledChecked : uncontrolledChecked;

  const handleClick = () => {
    if (disabled) return;
    const newChecked = !checked;
    if (!isControlled) setUncontrolledChecked(newChecked);
    onCheckedChange?.(newChecked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleClick();
    }
  };

  const generatedId = React.useId();
  const switchId = id || generatedId;

  return (
    <div className={cn(switchBase, className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        aria-labelledby={label ? `${switchId}-label` : undefined}
        aria-describedby={description ? `${switchId}-desc` : undefined}
        id={switchId}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          switchTrackBase,
          switchTrackSizes[size],
          switchTrackVariants[variant],
          disabled && "opacity-50 cursor-not-allowed",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base",
        )}
        data-checked={checked}
        {...rest}
      >
        <span className={cn(switchThumbBase, switchThumbSizes[size])} data-checked={checked} />
      </button>
      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <span id={`${switchId}-label`} className={switchLabel}>
              {label}
            </span>
          )}
          {description && (
            <span id={`${switchId}-desc`} className={switchDescription}>
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
