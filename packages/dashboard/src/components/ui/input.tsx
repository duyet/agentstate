"use client";

import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, description, error, mono = false, className = "", id, ...rest }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const describedBy =
      [description ? `${inputId}-desc` : null, error ? `${inputId}-error` : null]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-fg">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          className={cn(
            "flex min-h-[40px] w-full rounded-[var(--radius)] border border-edge bg-panel2 px-3 py-2.5 text-[13px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-fg-4",
            "focus:border-accent focus:ring-1 focus:ring-accent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            mono && "font-mono",
            error && "border-neg focus:border-neg focus:ring-neg",
            className,
          )}
          {...rest}
        />
        {description && !error && (
          <p id={`${inputId}-desc`} className="text-[12px] text-fg-4">
            {description}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-[12px] text-neg" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  mono?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, description, error, mono = false, className = "", id, ...rest }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;
    const describedBy =
      [description ? `${textareaId}-desc` : null, error ? `${textareaId}-error` : null]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-[13px] font-medium text-fg">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          className={cn(
            "flex min-h-[80px] w-full rounded-[var(--radius)] border border-edge bg-panel2 px-3 py-2.5 text-[13px] text-fg outline-none transition-[border-color,box-shadow] placeholder:text-fg-4 resize-y",
            "focus:border-accent focus:ring-1 focus:ring-accent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            mono && "font-mono",
            error && "border-neg focus:border-neg focus:ring-neg",
            className,
          )}
          {...rest}
        />
        {description && !error && (
          <p id={`${textareaId}-desc`} className="text-[12px] text-fg-4">
            {description}
          </p>
        )}
        {error && (
          <p id={`${textareaId}-error`} className="text-[12px] text-neg" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children?: ReactNode;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, className = "", ...rest }, ref) => (
    // biome-ignore lint/a11y/noLabelWithoutControl: reusable primitive; htmlFor passed via rest
    <label ref={ref} className={cn("text-[13px] font-medium text-fg", className)} {...rest}>
      {children}
    </label>
  ),
);

Label.displayName = "Label";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  mono?: boolean;
  options: { value: string; label: ReactNode }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, description, error, mono = false, className = "", options, placeholder, id, ...rest },
    ref,
  ) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;
    const describedBy =
      [description ? `${selectId}-desc` : null, error ? `${selectId}-error` : null]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[13px] font-medium text-fg">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            className={cn(
              "flex min-h-[40px] w-full appearance-none rounded-[var(--radius)] border border-edge bg-panel2 px-3 py-2.5 pr-10 text-[13px] text-fg outline-none transition-[border-color,box-shadow]",
              "focus:border-accent focus:ring-1 focus:ring-accent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              mono && "font-mono",
              error && "border-neg focus:border-neg focus:ring-neg",
              className,
            )}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-fg-4">
            <svg
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
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
        {description && !error && (
          <p id={`${selectId}-desc`} className="text-[12px] text-fg-4">
            {description}
          </p>
        )}
        {error && (
          <p id={`${selectId}-error`} className="text-[12px] text-neg" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
