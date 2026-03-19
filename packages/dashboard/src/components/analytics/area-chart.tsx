"use client";

import {
  Area,
  CartesianGrid,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS, CHART_DEFAULTS } from "@/lib/constants";
import type { DataPoint } from "./chart-utils";
import {
  fillDateGaps,
  formatDateLabel,
  formatTooltipValue,
  generateGradientId,
  CHART_AXIS_TICK_STYLE,
  CHART_TOOLTIP_STYLE,
} from "./chart-utils";

interface AreaChartCardProps {
  /** Chart title displayed above the chart */
  title: string;
  /** Time-series data points */
  data: DataPoint[];
  /** Area fill color (defaults to primary blue) */
  color?: string;
  /** Label for values in tooltip */
  valueLabel?: string;
}

/**
 * AreaChartCard - A responsive area chart for displaying time-series analytics.
 *
 * Commonly used for conversations, messages, and token usage over time.
 * Automatically fills missing dates with zero values for accurate visualization.
 *
 * @example
 * ```tsx
 * <AreaChartCard
 *   title="Conversations"
 *   data={conversationsPerDay}
 *   color={CHART_COLORS.primary}
 *   valueLabel="Conversations"
 * />
 * ```
 */
export function AreaChartCard({
  title,
  data,
  color = CHART_COLORS.primary,
  valueLabel = "Count",
}: AreaChartCardProps) {
  const filled = fillDateGaps(data, CHART_DEFAULTS.DAYS_TO_FILL);
  const gradientId = generateGradientId();

  return (
    <div className="border border-border rounded-lg p-5 bg-card">
      <h3 className="text-sm font-medium text-foreground mb-4">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={filled} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={color}
                  stopOpacity={CHART_DEFAULTS.AREA_GRADIENT_START_OPACITY}
                />
                <stop
                  offset="100%"
                  stopColor={color}
                  stopOpacity={CHART_DEFAULTS.AREA_GRADIENT_END_OPACITY}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={CHART_AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={CHART_AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelFormatter={(label) => formatDateLabel(String(label))}
              formatter={(value) => formatTooltipValue(value, valueLabel)}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={CHART_DEFAULTS.AREA_STROKE_WIDTH}
              fill={`url(#${gradientId})`}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
