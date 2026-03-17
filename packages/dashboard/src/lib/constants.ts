/**
 * Unified role styling for message badges across the dashboard.
 * Maps roles to shadcn Badge variants for consistent theming.
 */
export const ROLE_BADGE_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  user: "outline",
  assistant: "default",
  system: "secondary",
  tool: "outline",
};
