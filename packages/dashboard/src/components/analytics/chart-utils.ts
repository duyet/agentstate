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
