/**
 * Unified role styling for message badges across the dashboard.
 *
 * Emits shadcn Badge variant strings as the contract; the Kumo Badge consumer
 * (`app/dashboard/project/_conversation-message.tsx`) translates these to Kumo
 * variants via its SHADCN_TO_KUMO_BADGE map. Do NOT change these values to
 * Kumo variants without also updating that consumer's translation map.
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

/**
 * Chart color palette for consistent analytics visualization.
 */
export const CHART_COLORS = {
  primary: "#2563eb", // blue
  success: "#16a34a", // green
  accent: "#9333ea", // purple
  cost: "#ea580c", // orange
} as const;

/**
 * Default chart configuration values.
 */
export const CHART_DEFAULTS = {
  DAYS_TO_FILL: 30,
  AREA_STROKE_WIDTH: 2,
  AREA_GRADIENT_START_OPACITY: 0.2,
  AREA_GRADIENT_END_OPACITY: 0,
} as const;
