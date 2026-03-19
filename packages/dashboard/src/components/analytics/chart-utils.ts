import { CHART_COLORS } from "@/lib/constants";

/**
 * Data point for time-series chart data.
 */
export interface DataPoint {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Numeric value for the data point */
  value: number;
}

/**
 * Creates area chart configuration object.
 * Combines gradient generation and styling defaults.
 */
export interface AreaChartConfig {
  gradientId: string;
  color: string;
}

/**
 * Generates area chart gradient ID and returns default color.
 */
export function createAreaChartConfig(colorOverride?: string): AreaChartConfig {
  return {
    gradientId: generateGradientId(),
    color: colorOverride ?? CHART_COLORS.primary,
  };
}

/**
 * Fills missing dates in time-series data with zero values.
 * Ensures continuous date ranges for accurate chart rendering.
 *
 * @param data - Array of data points with potential date gaps
 * @param days - Number of days to generate when data is empty
 * @returns Complete array with all dates filled (missing dates have value: 0)
 *
 * @example
 * ```ts
 * fillDateGaps([{ date: "2026-03-17", value: 5 }, { date: "2026-03-19", value: 3 }], 30)
 * // Returns data for 2026-03-17, 2026-03-18 (value: 0), 2026-03-19
 * ```
 */
export function fillDateGaps(data: DataPoint[], days: number): DataPoint[] {
  if (data.length === 0) {
    // Generate empty date range
    const result: DataPoint[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      result.push({ date: d.toISOString().slice(0, 10), value: 0 });
    }
    return result;
  }

  const map = new Map(data.map((d) => [d.date, d.value]));
  const result: DataPoint[] = [];

  // Parse first date and fill forward
  const start = new Date(data[0].date);
  const end = new Date(data[data.length - 1].date);

  const current = new Date(start);
  while (current <= end) {
    const key = current.toISOString().slice(0, 10);
    result.push({ date: key, value: map.get(key) ?? 0 });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Formats an ISO date string to a short readable label.
 *
 * @param dateStr - Date string in ISO format (YYYY-MM-DD)
 * @returns Formatted date like "Mar 17"
 *
 * @example
 * ```ts
 * formatDateLabel("2026-03-17") // "Mar 17"
 * ```
 */
export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Generates a unique gradient ID for area chart fills.
 * Uses a counter to ensure uniqueness across multiple chart instances.
 */
let gradientIdCounter = 0;
export function generateGradientId(): string {
  return `chart-gradient-${gradientIdCounter++}`;
}

/**
 * Standard tooltip content style for Recharts tooltips.
 * Matches shadcn card styling for consistency.
 */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
} as const;

/**
 * Standard XAxis tick style for charts.
 */
export const CHART_AXIS_TICK_STYLE = {
  fontSize: 11,
  fill: "hsl(var(--muted-foreground))",
} as const;

/**
 * Formats a value for display in chart tooltips.
 */
export function formatTooltipValue(value: unknown, label: string): [string, string] {
  return [Number(value).toLocaleString(), label];
}
