import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input"> & {
  label?: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  mono?: boolean
}

function Input({
  className,
  type,
  label,
  description,
  error,
  mono = false,
  id,
  ...props
}: InputProps) {
  const generatedId = React.useId()
  const inputId = id || generatedId
  const describedBy =
    [description ? `${inputId}-desc` : null, error ? `${inputId}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-foreground">
          {label}
        </label>
      )}
      <InputPrimitive
        type={type}
        id={inputId}
        data-slot="input"
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn(
          "h-8 w-full min-w-0 rounded-none border border-border bg-background px-2.5 py-1 font-mono text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-primary disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
          mono && "font-mono",
          className
        )}
        {...props}
      />
      {description && !error && (
        <p id={`${inputId}-desc`} className="text-[12px] text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-[12px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: React.ReactNode
    description?: React.ReactNode
    error?: React.ReactNode
    mono?: boolean
  }
>(({ label, description, error, mono = false, className = "", id, ...rest }, ref) => {
  const generatedId = React.useId()
  const textareaId = id || generatedId
  const describedBy =
    [description ? `${textareaId}-desc` : null, error ? `${textareaId}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="text-[13px] font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn(
          "flex min-h-[80px] w-full resize-y rounded-none border border-border bg-background px-2.5 py-2 font-mono text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
          mono && "font-mono",
          className
        )}
        {...rest}
      />
      {description && !error && (
        <p id={`${textareaId}-desc`} className="text-[12px] text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={`${textareaId}-error`} className="text-[12px] text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
Textarea.displayName = "Textarea"

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ children, className = "", ...rest }, ref) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: reusable primitive; htmlFor passed via rest
  <label ref={ref} className={cn("text-[13px] font-medium text-foreground", className)} {...rest}>
    {children}
  </label>
))
Label.displayName = "Label"

const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: React.ReactNode
    description?: React.ReactNode
    error?: React.ReactNode
    mono?: boolean
    options: { value: string; label: React.ReactNode }[]
    placeholder?: string
  }
>(
  (
    { label, description, error, mono = false, className = "", options, placeholder, id, ...rest },
    ref
  ) => {
    const generatedId = React.useId()
    const selectId = id || generatedId
    const describedBy =
      [description ? `${selectId}-desc` : null, error ? `${selectId}-error` : null]
        .filter(Boolean)
        .join(" ") || undefined

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[13px] font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={cn(
              "flex h-8 w-full appearance-none rounded-none border border-border bg-background px-2.5 py-1 pr-10 font-mono text-[13px] text-foreground outline-none transition-colors focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
              mono && "font-mono",
              className
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
          <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">
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
          <p id={`${selectId}-desc`} className="text-[12px] text-muted-foreground">
            {description}
          </p>
        )}
        {error && (
          <p id={`${selectId}-error`} className="text-[12px] text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Select.displayName = "Select"

export { Input, Textarea, Label, Select }
