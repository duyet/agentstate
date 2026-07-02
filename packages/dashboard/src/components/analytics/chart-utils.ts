/**
 * Data point for time-series chart data.
 */
export interface DataPoint {
  /** Date in ISO format (YYYY-MM-DD) */
  date: string;
  /** Numeric value for the data point */
  value: number;
}

/** Named `chart-*` series tokens defined in `src/styles/global.css`. */
export type ChartToken = "chart-1" | "chart-2" | "chart-3" | "chart-4" | "chart-5";

/** Any `--color-*` design token defined in `tokens.css` / `global.css`. */
export type ColorToken = ChartToken | "panel" | "edge" | "fg" | "fg-3";

/**
 * Resolves a `--color-*` custom property to its current computed value (a
 * real hex/rgb string) so it can be handed to canvas-based chart libraries
 * (echarts) that can't read CSS `var()`.
 *
 * Reads from `document.documentElement`, so it automatically reflects the
 * light/dark value currently active via the `.dark` class (see tokens.css).
 * Call again (e.g. on theme change) to pick up the flipped palette.
 */
export function resolveChartColor(token: ColorToken): string {
  if (typeof document === "undefined") return "#e2664d";
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${token}`)
    .trim();
  return value || "#e2664d";
}

/** Converts a resolved hex/rgb color string to an rgba string with the given alpha. */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

/**
 * Fills missing dates in time-series data with zero values.
 * Ensures continuous date ranges for accurate chart rendering.
 *
 * @param data - Array of data points with potential date gaps
 * @param days - Number of days to generate when data is empty
 * @returns Complete array with all dates filled (missing dates have value: 0)
 */
export function fillDateGaps(data: DataPoint[], days: number): DataPoint[] {
  if (data.length === 0) {
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
