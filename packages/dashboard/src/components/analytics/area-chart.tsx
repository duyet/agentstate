"use client";

import {
  Area,
  Dot,
  AreaChart as RechartsAreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_DEFAULTS } from "@/lib/constants";
import type { DataPoint } from "./chart-utils";
import {
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  fillDateGaps,
  formatCompact,
  formatDateLabel,
  formatTooltipValue,
  generateGradientId,
} from "./chart-utils";

interface AreaChartCardProps {
  title: string;
  data: DataPoint[];
  /** Stroke + fill color. Pass a CSS var so the chart adapts to dark mode. */
  color?: string;
  valueLabel?: string;
  formatValue?: (value: number) => string;
  /** Full-width variant (slightly shorter chart). */
  wide?: boolean;
}

const chartMargin = { top: 6, right: 6, bottom: 0, left: 0 };

function createGradient(id: string, color: string) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={0.07} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  );
}

/**
 * Minimal time-series area chart matching the AgentState analytics prototype:
 * thin stroke, faint fill, three soft gridlines, a dot on the last point, no
 * axes chrome. Title + compact total in the header; range start/end dates in
 * the footer. Fills missing dates with zeros and preserves real data wiring.
 */
export function AreaChartCard({
  title,
  data,
  color = "var(--chart-1)",
  valueLabel = "Count",
  formatValue,
  wide = false,
}: AreaChartCardProps) {
  const filled = fillDateGaps(data, CHART_DEFAULTS.DAYS_TO_FILL);
  const gradientId = generateGradientId();

  const total = filled.reduce((sum, d) => sum + d.value, 0);
  const totalLabel = formatValue ? formatValue(total) : formatCompact(total);
  const lastIndex = filled.length - 1;
  const startLabel = filled.length > 0 ? formatDateLabel(filled[0].date) : "";
  const endLabel = filled.length > 0 ? formatDateLabel(filled[lastIndex].date) : "";

  return (
    <div className="rounded-lg border border-border bg-card p-[18px] shadow-sm">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h3 className="text-base text-foreground">{title}</h3>
        <span suppressHydrationWarning className="font-mono text-[13px] text-ink-2">
          {totalLabel}
        </span>
      </div>

      <div className={`relative ${wide ? "h-[130px]" : "h-[150px]"}`}>
        {/* Three soft gridlines (matches the prototype's 25/50/75% rules). */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {[0.25, 0.5, 0.75].map((g) => (
            <div
              key={g}
              className="absolute inset-x-0 border-t border-line-soft"
              style={{ top: `${g * 100}%` }}
            />
          ))}
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={filled} margin={chartMargin}>
            <defs>{createGradient(gradientId, color)}</defs>
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              cursor={{ stroke: "var(--line-soft)", strokeWidth: 1 }}
              labelFormatter={(label) => formatDateLabel(String(label))}
              formatter={(value) =>
                formatValue
                  ? [formatValue(Number(value)), valueLabel]
                  : formatTooltipValue(value, valueLabel)
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={CHART_DEFAULTS.AREA_STROKE_WIDTH}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
              activeDot={{ r: 3.5, fill: color, strokeWidth: 0 }}
              dot={(props) => {
                const { key, cx, cy, index } = props;
                if (index !== lastIndex || cx == null || cy == null) {
                  return <Dot key={key} cx={cx} cy={cy} r={0} />;
                }
                return <Dot key={key} cx={cx} cy={cy} r={3.5} fill={color} strokeWidth={0} />;
              }}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex justify-between">
        <span className="font-mono text-[10.5px] text-faint">{startLabel}</span>
        <span className="font-mono text-[10.5px] text-faint">{endLabel}</span>
      </div>
    </div>
  );
}
