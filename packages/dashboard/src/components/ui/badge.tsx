import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border border-transparent px-2 py-0.5 font-mono text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        live: "border-pos/40 bg-pos/10 text-pos",
        warn: "border-warn/40 bg-warn/10 text-warn",
        idle: "border-border text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export type Tone = "default" | "live" | "warn" | "idle"

const toneVariant: Record<Tone, NonNullable<VariantProps<typeof badgeVariants>["variant"]>> = {
  default: "outline",
  live: "live",
  warn: "warn",
  idle: "idle",
}

function Badge({
  className,
  variant = "default",
  tone,
  dot = false,
  render,
  children,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    tone?: Tone
    dot?: boolean
  }) {
  const resolved = tone ? toneVariant[tone] : variant
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant: resolved }), className),
        children: (
          <>
            {dot && (
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  tone === "live" && "bg-pos",
                  tone === "warn" && "bg-warn",
                  (tone === "idle" || tone === "default" || !tone) && "bg-muted-foreground",
                )}
              />
            )}
            {children}
          </>
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant: resolved,
    },
  })
}

export { Badge, badgeVariants }
